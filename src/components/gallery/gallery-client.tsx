"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { EventRow, GalleryImage, GallerySection, EventTypeRow } from "@/lib/types";
import { canWriteEvents, type UserRole } from "@/lib/types";
import { PageHeader, EmptyState, Tag } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { formatDate, safeFileName } from "@/lib/utils";
import {
  Images, Upload, X, Download, ChevronLeft, ChevronRight, Loader2,
  Folder, FolderPlus, CalendarDays,
} from "lucide-react";

const MAX_SIZE = 8 * 1024 * 1024; // 8MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type ImageWithEvent = GalleryImage & { events?: { id: string; name: string; event_type: string } | null };
type SectionWithEvent = GallerySection & { events?: { id: string; name: string; event_type: string } | null };

export function GalleryClient({
  images, sections, events, eventTypes, role,
}: {
  images: ImageWithEvent[];
  sections: SectionWithEvent[];
  events: EventRow[];
  eventTypes: EventTypeRow[];
  role: UserRole;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const canWrite = canWriteEvents(role);

  const [typeFilter, setTypeFilter] = useState("");
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadEventId, setUploadEventId] = useState("");
  const [uploadSectionId, setUploadSectionId] = useState("");
  const [newSectionName, setNewSectionName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const colorOf = (type: string) => eventTypes.find((t) => t.name === type)?.color ?? "#64748b";

  // ---------- grouping: event type -> events -> sections -> images ----------
  const groups = useMemo(() => {
    const eventMap = new Map(events.map((e) => [e.id, e]));

    // collect per-event data
    const perEvent = new Map<string, { sections: GallerySection[]; bySection: Map<string, GalleryImage[]>; orphan: GalleryImage[] }>();
    const bucket = (eventId: string) => {
      if (!perEvent.has(eventId)) perEvent.set(eventId, { sections: [], bySection: new Map(), orphan: [] });
      return perEvent.get(eventId)!;
    };
    for (const s of sections) bucket(s.event_id).sections.push(s);
    for (const img of images) {
      const b = bucket(img.event_id);
      if (img.section_id) {
        if (!b.bySection.has(img.section_id)) b.bySection.set(img.section_id, []);
        b.bySection.get(img.section_id)!.push(img);
      } else {
        b.orphan.push(img);
      }
    }

    // group by event type
    const typeMap = new Map<string, { type: string; items: { event: EventRow; sections: GallerySection[]; bySection: Map<string, GalleryImage[]>; orphan: GalleryImage[] }[] }>();
    for (const [eventId, data] of perEvent) {
      const ev = eventMap.get(eventId);
      if (!ev) continue;
      if (typeFilter && ev.event_type !== typeFilter) continue;
      if (!typeMap.has(ev.event_type)) typeMap.set(ev.event_type, { type: ev.event_type, items: [] });
      typeMap.get(ev.event_type)!.items.push({ event: ev, sections: data.sections, bySection: data.bySection, orphan: data.orphan });
    }

    const list = [...typeMap.values()].sort((a, b) => a.type.localeCompare(b.type));
    for (const g of list) g.items.sort((a, b) => b.event.start_date.localeCompare(a.event.start_date));
    return list;
  }, [images, sections, events, typeFilter]);

  const typeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const img of images) {
      const t = img.events?.event_type ?? "Other";
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [images]);

  // events with no images yet (for quick upload)
  const emptyEvents = useMemo(() => {
    const withImages = new Set(images.map((i) => i.event_id));
    return events.filter((e) =>
      !withImages.has(e.id) && e.status !== "Archived" && e.status !== "Cancelled" &&
      (!typeFilter || e.event_type === typeFilter),
    ).sort((a, b) => b.start_date.localeCompare(a.start_date));
  }, [events, images, typeFilter]);

  // flat list for lightbox navigation
  const flat = useMemo(() => {
    if (!typeFilter) return images;
    return images.filter((i) => (i.events?.event_type ?? "Other") === typeFilter);
  }, [images, typeFilter]);

  // ---------- upload ----------
  const sectionsForEvent = useMemo(
    () => sections.filter((s) => s.event_id === uploadEventId),
    [sections, uploadEventId],
  );

  const openUpload = (eventId?: string) => {
    const eid = eventId ?? "";
    setUploadEventId(eid);
    const secs = eid ? sections.filter((s) => s.event_id === eid) : [];
    setUploadSectionId(secs[0]?.id ?? "__new__");
    setNewSectionName("");
    setUploadOpen(true);
  };

  const onEventChange = (eid: string) => {
    setUploadEventId(eid);
    const secs = eid ? sections.filter((s) => s.event_id === eid) : [];
    setUploadSectionId(secs[0]?.id ?? "__new__");
    setNewSectionName("");
  };

  const uploadFiles = async (files: FileList | File[]) => {
    if (!uploadEventId) { toast("Select an event first.", "error"); return; }
    const list = Array.from(files);
    const invalid = list.find((f) => !ALLOWED.includes(f.type) || f.size > MAX_SIZE);
    if (invalid) { toast(`${invalid.name}: only JPEG/PNG/WebP/GIF up to 8MB allowed.`, "error"); return; }

    const sb = createClient();
    let sid = uploadSectionId;

    setBusy(true);
    try {
      // create a new section if requested
      if (sid === "__new__") {
        const name = newSectionName.trim();
        if (!name) { toast("Enter a name for the new section.", "error"); setBusy(false); return; }
        const { data, error } = await sb
          .from("event_gallery_sections")
          .insert({
            event_id: uploadEventId,
            name,
            sort_order: sections.filter((s) => s.event_id === uploadEventId).length,
          })
          .select("id")
          .single();
        if (error) throw error;
        sid = data.id;
      }

      setUploading({ done: 0, total: list.length });
      let ok = 0;
      for (const file of list) {
        try {
          const ext = file.name.split(".").pop() ?? "jpg";
          const path = `${uploadEventId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeFileName(ext)}`;
          const { error } = await sb.storage.from("event-gallery").upload(path, file, { contentType: file.type });
          if (error) throw error;
          const { data: urlData } = sb.storage.from("event-gallery").getPublicUrl(path);
          const { error: dbErr } = await sb.from("event_gallery").insert({
            event_id: uploadEventId,
            section_id: sid,
            storage_path: path,
            public_url: urlData.publicUrl,
            caption: "",
            photographer: "",
            size_bytes: file.size,
          });
          if (dbErr) throw dbErr;
          ok++;
        } catch (err) {
          toast(err instanceof Error ? err.message : `Upload failed for ${file.name}`, "error");
        }
        setUploading((u) => (u ? { ...u, done: u.done + 1 } : u));
      }
      if (ok > 0) {
        toast(`${ok} image${ok === 1 ? "" : "s"} uploaded`);
        router.refresh();
        setUploadOpen(false);
      }
    } finally {
      setUploading(null);
      setBusy(false);
    }
  };

  const nav = (dir: 1 | -1) => {
    if (lightbox === null) return;
    setLightbox((lightbox + dir + flat.length) % flat.length);
  };

  // ---------- rendering helpers ----------
  const grid = (list: GalleryImage[]) => (
    <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 160px), 1fr))" }}>
      {list.map((img) => {
        const idx = flat.indexOf(img);
        return (
          <button
            key={img.id}
            className="card card-hover overflow-hidden group text-left"
            onClick={() => setLightbox(idx)}
            aria-label={`Open image: ${img.caption || "gallery image"}`}
          >
            <span className="block w-full aspect-[4/3] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.public_url} alt={img.caption || "Event image"} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
            </span>
            <span className="block p-2">
              <span className="block text-[11.5px] text-slate-600 line-clamp-1">{img.caption || <span className="text-slate-400">No caption</span>}</span>
            </span>
          </button>
        );
      })}
    </div>
  );

  const sectionHeader = (name: string, count: number, icon?: boolean) => (
    <p className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 mb-2">
      {icon && <Folder size={12} className="text-slate-400" />}
      {name}
      <span className="font-normal text-slate-400">· {count} image{count === 1 ? "" : "s"}</span>
    </p>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Gallery"
        description={`${images.length} image${images.length === 1 ? "" : "s"} across ${new Set(images.map((i) => i.event_id)).size} events, organized by event type`}
        actions={canWrite && (
          <button onClick={() => openUpload()} className="btn btn-primary btn-sm"><Upload size={15} /> Upload Images</button>
        )}
      />

      {/* event type filter pills */}
      {typeOptions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            className="badge"
            style={{ padding: "6px 14px", fontSize: "12.5px", background: !typeFilter ? "var(--brand)" : "var(--surface)", color: !typeFilter ? "#fff" : "var(--muted)", border: "1px solid var(--border)" }}
            onClick={() => setTypeFilter("")}
          >
            All ({images.length})
          </button>
          {typeOptions.map(([type, count]) => (
            <button
              key={type}
              className="badge"
              style={{
                padding: "6px 14px", fontSize: "12.5px",
                background: typeFilter === type ? (colorOf(type)) : "var(--surface)",
                color: typeFilter === type ? "#fff" : "var(--muted)",
                border: "1px solid var(--border)",
              }}
              onClick={() => setTypeFilter(typeFilter === type ? "" : type)}
            >
              {type} ({count})
            </button>
          ))}
        </div>
      )}

      {images.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Images}
            title="No gallery images yet"
            description={canWrite
              ? "Upload images into any event — create sections like “Opening Ceremony” or “Day 1” to organize them."
              : "Photos uploaded for events will appear here, organized by event type."}
            action={canWrite ? <button onClick={() => openUpload()} className="btn btn-primary btn-sm"><Upload size={15} /> Upload Images</button> : undefined}
          />
        </div>
      ) : (
        groups.map((g) => {
          const imageCount = g.items.reduce((s, it) => s + it.bySection.size + it.orphan.length, 0);
          return (
            <div key={g.type} className="space-y-4">
              <div className="flex items-center gap-2.5 pt-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: colorOf(g.type) }} aria-hidden />
                <h2 className="font-bold text-[15px] tracking-tight">{g.type}</h2>
                <span className="badge" style={{ background: "var(--surface-2)", color: "var(--muted)" }}>
                  {g.items.length} event{g.items.length === 1 ? "" : "s"}
                </span>
              </div>

              {g.items.map(({ event, sections: evSections, bySection, orphan }) => (
                <div key={event.id} className="card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <Link href={`/events/${event.id}`} className="font-semibold text-[14px] hover:text-blue-700 hover:underline">
                        {event.name}
                      </Link>
                      <p className="text-[11.5px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <CalendarDays size={11} /> {formatDate(event.start_date)}
                        {event.city || event.country ? ` · ${[event.city, event.country].filter(Boolean).join(", ")}` : ""}
                      </p>
                    </div>
                    {canWrite && (
                      <button className="btn btn-secondary btn-sm" onClick={() => openUpload(event.id)}>
                        <Upload size={13} /> Upload here
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {evSections.map((s) => {
                      const secImages = bySection.get(s.id) ?? [];
                      return (
                        <div key={s.id}>
                          {sectionHeader(s.name, secImages.length, true)}
                          {secImages.length === 0
                            ? <p className="text-[12px] text-slate-400">No images in this section yet.</p>
                            : grid(secImages)}
                        </div>
                      );
                    })}
                    {orphan.length > 0 && (
                      <div>
                        {sectionHeader("Unsectioned", orphan.length)}
                        {grid(orphan)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })
      )}

      {/* events with no gallery yet — quick upload targets */}
      {canWrite && emptyEvents.length > 0 && (
        <div className="card p-4">
          <p className="text-[12px] font-bold uppercase tracking-wider text-slate-400 mb-3">
            Events with no images yet — start their gallery
          </p>
          <div className="flex flex-wrap gap-2">
            {emptyEvents.map((e) => (
              <button
                key={e.id}
                className="flex items-center gap-2 rounded-xl border px-3 py-2 text-[12.5px] font-medium hover:border-blue-300 transition-colors"
                onClick={() => openUpload(e.id)}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: colorOf(e.event_type) }} aria-hidden />
                <span className="max-w-[220px] truncate">{e.name}</span>
                <Upload size={12} className="text-slate-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* hidden file input for upload modal */}
      <input
        ref={inputRef} type="file" multiple accept={ALLOWED.join(",")} className="hidden"
        onChange={(e) => { if (e.target.files?.length) uploadFiles(e.target.files); e.target.value = ""; }}
      />

      {/* upload modal */}
      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload Images" wide>
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="up-event">Event *</label>
              <select id="up-event" className="select" value={uploadEventId} onChange={(e) => onEventChange(e.target.value)}>
                <option value="">— Select an event —</option>
                {[...new Set(events.filter((e) => e.status !== "Archived").map((e) => e.event_type))].sort().map((type) => (
                  <optgroup key={type} label={type}>
                    {events.filter((e) => e.event_type === type && e.status !== "Archived")
                      .sort((a, b) => b.start_date.localeCompare(a.start_date))
                      .map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="up-section">Gallery Section *</label>
              <select id="up-section" className="select" value={uploadSectionId} onChange={(e) => setUploadSectionId(e.target.value)} disabled={!uploadEventId}>
                {sectionsForEvent.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                <option value="__new__">➕ Create new section…</option>
              </select>
            </div>
          </div>

          {uploadSectionId === "__new__" && uploadEventId && (
            <div>
              <label className="label" htmlFor="up-newsec">New Section Name *</label>
              <div className="flex gap-2">
                <input
                  id="up-newsec" className="input" autoFocus
                  value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)}
                  placeholder="e.g. Opening Ceremony, Kids Corner, Day 1"
                />
              </div>
              <p className="text-[11.5px] text-slate-400 mt-1">
                The section is created inside the selected event when the upload starts.
              </p>
            </div>
          )}

          {uploadEventId && (
            <div
              className="rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer"
              style={{ borderColor: dragOver ? "var(--brand-ink)" : "var(--border)", background: dragOver ? "var(--brand-soft)" : "transparent" }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files); }}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter") inputRef.current?.click(); }}
              aria-label="Upload images"
            >
              {uploading ? (
                <div className="flex items-center justify-center gap-2 text-[13px] text-slate-600">
                  <Loader2 size={16} className="animate-spin" />
                  Uploading {uploading.done + 1} of {uploading.total}…
                </div>
              ) : busy ? (
                <div className="flex items-center justify-center gap-2 text-[13px] text-slate-600">
                  <Loader2 size={16} className="animate-spin" /> Preparing section…
                </div>
              ) : (
                <>
                  <Upload size={20} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-[13.5px] font-medium">
                    Drop images for “{events.find((e) => e.id === uploadEventId)?.name}”
                    {uploadSectionId !== "__new__" && ` · ${sectionsForEvent.find((s) => s.id === uploadSectionId)?.name ?? ""}`}
                  </p>
                  <p className="text-[12px] text-slate-400 mt-1">or click to browse · JPEG/PNG/WebP/GIF · max 8MB each</p>
                </>
              )}
            </div>
          )}

          {!uploadEventId && (
            <p className="text-[13px] text-slate-400 text-center py-4">Select an event to start uploading.</p>
          )}
        </div>
      </Modal>

      {/* lightbox */}
      {lightbox !== null && flat[lightbox] && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center"
          style={{ background: "rgba(10,12,18,0.92)" }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setLightbox(null); }}
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
        >
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setLightbox(null)} aria-label="Close"><X size={24} /></button>
          {flat.length > 1 && (
            <>
              <button className="absolute left-4 text-white/70 hover:text-white p-2" onClick={() => nav(-1)} aria-label="Previous"><ChevronLeft size={28} /></button>
              <button className="absolute right-4 text-white/70 hover:text-white p-2" onClick={() => nav(1)} aria-label="Next" style={{ right: "3.5rem" }}><ChevronRight size={28} /></button>
            </>
          )}
          <div className="max-w-[88vw] max-h-[82vh] flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={flat[lightbox].public_url} alt={flat[lightbox].caption || "Event image"} className="max-w-full max-h-[70vh] object-contain rounded-lg" />
            <div className="text-center text-white/90">
              {flat[lightbox].events?.name && (
                <p className="text-[14px] font-semibold">{flat[lightbox].events.name}</p>
              )}
              <p className="text-[12px] text-white/50">
                {sections.find((s) => s.id === flat[lightbox].section_id)?.name ?? "Unsectioned"}
                {" · "}{flat[lightbox].caption || "Untitled"}
                {" · "}{lightbox + 1} / {flat.length}
              </p>
            </div>
            <a href={flat[lightbox].public_url} download target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
              <Download size={14} /> Download
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
