"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { GalleryImage, GallerySection } from "@/lib/types";
import { EmptyState } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { formatDate, safeFileName } from "@/lib/utils";
import {
  Images, Upload, X, Trash2, Star, Download, ChevronLeft, ChevronRight,
  Loader2, FolderPlus, Folder, Pencil, FolderInput,
} from "lucide-react";

const MAX_SIZE = 8 * 1024 * 1024; // 8MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function GalleryTab({ eventId, sections, images, canWrite, readOnly }: {
  eventId: string;
  sections: GallerySection[];
  images: GalleryImage[];
  canWrite: boolean;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [captionEdit, setCaptionEdit] = useState<GalleryImage | null>(null);
  const [caption, setCaption] = useState("");
  const [sectionModal, setSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState<GallerySection | null>(null);
  const [sectionForm, setSectionForm] = useState({ name: "", description: "" });
  const [moveTarget, setMoveTarget] = useState<GalleryImage | null>(null);

  const bySection = useMemo(() => {
    const map = new Map<string, GalleryImage[]>();
    for (const s of sections) map.set(s.id, []);
    // images with a deleted/unknown section fall into the first section or a virtual bucket
    const orphan: GalleryImage[] = [];
    for (const img of images) {
      if (img.section_id && map.has(img.section_id)) map.get(img.section_id)!.push(img);
      else orphan.push(img);
    }
    return { map, orphan };
  }, [sections, images]);

  const ensureDefaultSection = async (): Promise<string | null> => {
    const sb = createClient();
    let target = sections[0];
    if (!target) {
      const { data, error } = await sb
        .from("event_gallery_sections")
        .insert({ event_id: eventId, name: "General", description: "Uncategorized images", sort_order: 0 })
        .select("id")
        .single();
      if (error) { toast(error.message, "error"); return null; }
      target = { ...data, event_id: eventId, name: "General", description: "", sort_order: 0, created_at: "" } as GallerySection;
      router.refresh();
    }
    return target.id;
  };

  const uploadFiles = async (files: FileList | File[], sectionId: string | null) => {
    const list = Array.from(files);
    const invalid = list.find((f) => !ALLOWED.includes(f.type) || f.size > MAX_SIZE);
    if (invalid) {
      toast(`${invalid.name}: only JPEG/PNG/WebP/GIF up to 8MB allowed.`, "error");
      return;
    }
    let sid = sectionId;
    if (!sid) sid = await ensureDefaultSection();
    if (!sid) return;

    setUploading({ done: 0, total: list.length });
    const sb = createClient();
    let ok = 0;
    for (const file of list) {
      try {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${eventId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeFileName(ext)}`;
        const { error } = await sb.storage.from("event-gallery").upload(path, file, { contentType: file.type });
        if (error) throw error;
        const { data: urlData } = sb.storage.from("event-gallery").getPublicUrl(path);
        const { error: dbErr } = await sb.from("event_gallery").insert({
          event_id: eventId,
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
    setUploading(null);
    if (ok > 0) {
      toast(`${ok} image${ok === 1 ? "" : "s"} uploaded`);
      router.refresh();
    }
  };

  const remove = async (img: GalleryImage) => {
    if (!confirm("Delete this image?")) return;
    const sb = createClient();
    await sb.storage.from("event-gallery").remove([img.storage_path]);
    const { error } = await sb.from("event_gallery").delete().eq("id", img.id);
    if (error) { toast(error.message, "error"); return; }
    toast("Image deleted");
    router.refresh();
  };

  const feature = async (img: GalleryImage) => {
    const sb = createClient();
    if (img.is_featured) {
      await sb.from("event_gallery").update({ is_featured: false }).eq("id", img.id);
    } else {
      await sb.from("event_gallery").update({ is_featured: false }).eq("event_id", eventId);
      await sb.from("event_gallery").update({ is_featured: true }).eq("id", img.id);
    }
    toast(img.is_featured ? "Removed featured" : "Marked as featured");
    router.refresh();
  };

  const saveCaption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captionEdit) return;
    const { error } = await createClient().from("event_gallery").update({ caption }).eq("id", captionEdit.id);
    if (error) { toast(error.message, "error"); return; }
    toast("Caption saved");
    setCaptionEdit(null);
    router.refresh();
  };

  const openNewSection = () => { setEditingSection(null); setSectionForm({ name: "", description: "" }); setSectionModal(true); };
  const openEditSection = (s: GallerySection) => { setEditingSection(s); setSectionForm({ name: s.name, description: s.description }); setSectionModal(true); };

  const saveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionForm.name.trim()) { toast("Section name is required.", "error"); return; }
    const sb = createClient();
    const payload = {
      event_id: eventId,
      name: sectionForm.name.trim(),
      description: sectionForm.description,
      sort_order: editingSection?.sort_order ?? sections.length,
    };
    const { error } = editingSection
      ? await sb.from("event_gallery_sections").update({ name: payload.name, description: payload.description }).eq("id", editingSection.id)
      : await sb.from("event_gallery_sections").insert(payload);
    if (error) { toast(error.message, "error"); return; }
    toast(editingSection ? "Section updated" : "Section created");
    setSectionModal(false);
    router.refresh();
  };

  const deleteSection = async (s: GallerySection) => {
    const count = bySection.map.get(s.id)?.length ?? 0;
    if (!confirm(`Delete section “${s.name}”?${count ? ` Its ${count} image${count === 1 ? "" : "s"} will be kept and moved to the first remaining section.` : ""}`)) return;
    const sb = createClient();
    // move images to the first other section, or leave null (General bucket)
    const fallback = sections.find((x) => x.id !== s.id);
    if (count && fallback) {
      await sb.from("event_gallery").update({ section_id: fallback.id }).eq("section_id", s.id);
    }
    const { error } = await sb.from("event_gallery_sections").delete().eq("id", s.id);
    if (error) { toast(error.message, "error"); return; }
    toast("Section deleted");
    router.refresh();
  };

  const moveImage = async (img: GalleryImage, sectionId: string) => {
    const { error } = await createClient().from("event_gallery").update({ section_id: sectionId || null }).eq("id", img.id);
    if (error) { toast(error.message, "error"); return; }
    toast(`Moved to ${sections.find((s) => s.id === sectionId)?.name ?? "General"}`);
    setMoveTarget(null);
    router.refresh();
  };

  const nav = (dir: 1 | -1) => {
    if (lightbox === null) return;
    setLightbox((lightbox + dir + images.length) % images.length);
  };

  const grid = (list: GalleryImage[], sectionKey: string) => (
    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 170px), 1fr))" }}>
      {list.map((img) => {
        const idx = images.indexOf(img);
        return (
          <div key={img.id} className="card card-hover overflow-hidden group relative">
            <button
              className="block w-full aspect-[4/3] overflow-hidden"
              onClick={() => setLightbox(idx)}
              aria-label={`Open image: ${img.caption || "gallery image"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.public_url} alt={img.caption || "Event image"} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
            </button>
            {img.is_featured && (
              <span className="absolute top-2 left-2 badge" style={{ background: "rgba(245,158,11,0.92)", color: "#fff" }}>
                <Star size={11} fill="currentColor" /> Featured
              </span>
            )}
            <div className="p-2.5">
              <p className="text-[12px] text-slate-600 line-clamp-1 min-h-4">{img.caption || <span className="text-slate-400">No caption</span>}</p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10.5px] text-slate-400">{formatDate(img.image_date ?? img.created_at)}</span>
                {canWrite && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="btn btn-ghost btn-sm !p-1" title="Caption" onClick={() => { setCaptionEdit(img); setCaption(img.caption); }}><i className="text-[11px] not-italic font-semibold">Aa</i></button>
                    <button className="btn btn-ghost btn-sm !p-1" title="Move to section" onClick={() => setMoveTarget(img)}><FolderInput size={12} /></button>
                    <button className="btn btn-ghost btn-sm !p-1" title={img.is_featured ? "Unfeature" : "Feature"} onClick={() => feature(img)}><Star size={12} className={img.is_featured ? "text-amber-500" : ""} /></button>
                    <button className="btn btn-ghost btn-sm !p-1 hover:!text-red-600" title="Delete" onClick={() => remove(img)}><Trash2 size={12} /></button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const dropZone = (sectionId: string | null, label: string) => (
    <div
      className="rounded-xl border-2 border-dashed p-5 text-center transition-colors cursor-pointer"
      style={{ borderColor: dragOver === (sectionId ?? "root") ? "var(--brand-ink)" : "var(--border)", background: dragOver === (sectionId ?? "root") ? "var(--brand-soft)" : "transparent" }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(sectionId ?? "root"); }}
      onDragLeave={() => setDragOver(null)}
      onDrop={(e) => { e.preventDefault(); setDragOver(null); if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files, sectionId); }}
      onClick={() => { pendingSection.current = sectionId; inputRef.current?.click(); }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") { pendingSection.current = sectionId; inputRef.current?.click(); } }}
      aria-label={`Upload images to ${label}`}
    >
      {uploading ? (
        <div className="flex items-center justify-center gap-2 text-[13px] text-slate-600">
          <Loader2 size={16} className="animate-spin" />
          Uploading {uploading.done + 1} of {uploading.total}…
        </div>
      ) : (
        <>
          <Upload size={18} className="mx-auto text-slate-400 mb-1.5" />
          <p className="text-[13px] font-medium">Drop images into “{label}”</p>
          <p className="text-[11.5px] text-slate-400 mt-0.5">or click to browse · JPEG/PNG/WebP/GIF · max 8MB</p>
        </>
      )}
    </div>
  );

  const pendingSection = useRef<string | null>(null);

  return (
    <div>
      {canWrite && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[14px]">Gallery — {sections.length} section{sections.length === 1 ? "" : "s"}, {images.length} image{images.length === 1 ? "" : "s"}</h3>
          <button className="btn btn-primary btn-sm" onClick={openNewSection}>
            <FolderPlus size={14} /> New Section
          </button>
        </div>
      )}

      {sections.length === 0 && images.length === 0 ? (
        <EmptyState
          icon={Images}
          title="No gallery yet"
          description={canWrite ? "Create your first section (e.g. “Opening Ceremony”, “Kids Corner”, “Day 1”), then upload images into it." : "Photos uploaded for this event will appear here."}
          action={canWrite ? <button onClick={openNewSection} className="btn btn-primary btn-sm"><FolderPlus size={14} /> Create Section</button> : undefined}
        />
      ) : (
        <div className="space-y-6">
          {sections.map((s) => {
            const list = bySection.map.get(s.id) ?? [];
            return (
              <div
                key={s.id}
                className="rounded-2xl border p-4"
                onDragOver={(e) => e.preventDefault()}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: "var(--brand-soft)", color: "#1e40af" }}>
                      <Folder size={15} />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-[14px] truncate">{s.name}</p>
                      {s.description && <p className="text-[11.5px] text-slate-500 truncate">{s.description}</p>}
                    </div>
                    <span className="badge" style={{ background: "var(--surface-2)", color: "var(--muted)" }}>{list.length}</span>
                  </div>
                  {canWrite && (
                    <div className="flex items-center gap-1">
                      <button className="btn btn-ghost btn-sm" title="Rename section" onClick={() => openEditSection(s)}><Pencil size={13} /></button>
                      <button className="btn btn-ghost btn-sm hover:!text-red-600" title="Delete section" onClick={() => deleteSection(s)}><Trash2 size={13} /></button>
                    </div>
                  )}
                </div>
                {canWrite && <div className="mb-3">{dropZone(s.id, s.name)}</div>}
                {list.length === 0 ? (
                  <p className="text-[12.5px] text-slate-400 py-2 text-center">No images in this section yet.</p>
                ) : (
                  grid(list, s.id)
                )}
              </div>
            );
          })}

          {/* orphans: images whose section was deleted */}
          {bySection.orphan.length > 0 && (
            <div className="rounded-2xl border p-4" style={{ borderStyle: "dashed" }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-8 h-8 rounded-lg grid place-items-center" style={{ background: "var(--surface-2)", color: "var(--muted)" }}>
                  <Images size={15} />
                </span>
                <p className="font-semibold text-[14px]">Unsectioned</p>
                <span className="badge" style={{ background: "var(--surface-2)", color: "var(--muted)" }}>{bySection.orphan.length}</span>
              </div>
              {canWrite && <div className="mb-3">{dropZone(null, "Unsectioned")}</div>}
              {grid(bySection.orphan, "orphan")}
            </div>
          )}

          {sections.length === 0 && images.length > 0 && canWrite && (
            <div>{dropZone(null, "General")}</div>
          )}
        </div>
      )}

      <input
        ref={inputRef} type="file" multiple accept={ALLOWED.join(",")} className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) uploadFiles(e.target.files, pendingSection.current ?? sections[0]?.id ?? null);
          e.target.value = "";
        }}
      />

      {/* lightbox */}
      {lightbox !== null && images[lightbox] && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center"
          style={{ background: "rgba(10,12,18,0.92)" }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setLightbox(null); }}
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
        >
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setLightbox(null)} aria-label="Close"><X size={24} /></button>
          {images.length > 1 && (
            <>
              <button className="absolute left-4 text-white/70 hover:text-white p-2" onClick={() => nav(-1)} aria-label="Previous"><ChevronLeft size={28} /></button>
              <button className="absolute right-4 text-white/70 hover:text-white p-2" onClick={() => nav(1)} aria-label="Next" style={{ right: "3.5rem" }}><ChevronRight size={28} /></button>
            </>
          )}
          <div className="max-w-[88vw] max-h-[82vh] flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[lightbox].public_url} alt={images[lightbox].caption || "Event image"} className="max-w-full max-h-[70vh] object-contain rounded-lg" />
            <div className="text-center text-white/90">
              <p className="text-[14px]">{images[lightbox].caption || "Untitled"}</p>
              <p className="text-[12px] text-white/50">
                {sections.find((s) => s.id === images[lightbox].section_id)?.name ?? "Unsectioned"}
                {" · "}{formatDate(images[lightbox].image_date ?? images[lightbox].created_at)}
                {images[lightbox].photographer && ` · by ${images[lightbox].photographer}`}
                {" · "}{lightbox + 1} / {images.length}
              </p>
            </div>
            <a href={images[lightbox].public_url} download target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
              <Download size={14} /> Download
            </a>
          </div>
        </div>
      )}

      {/* caption modal */}
      <Modal open={!!captionEdit} onClose={() => setCaptionEdit(null)} title="Edit Caption">
        <form onSubmit={saveCaption} className="space-y-3">
          {captionEdit && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={captionEdit.public_url} alt="" className="rounded-xl w-full aspect-video object-cover" />
          )}
          <div><label className="label">Caption</label><input className="input" value={caption} onChange={(e) => setCaption(e.target.value)} autoFocus /></div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setCaptionEdit(null)}>Cancel</button>
            <button className="btn btn-primary">Save</button>
          </div>
        </form>
      </Modal>

      {/* section create/edit modal */}
      <Modal open={sectionModal} onClose={() => setSectionModal(false)} title={editingSection ? "Edit Section" : "New Gallery Section"}>
        <form onSubmit={saveSection} className="space-y-3" noValidate>
          <div>
            <label className="label" htmlFor="sec-name">Section Name *</label>
            <input
              id="sec-name" className="input" required autoFocus
              value={sectionForm.name}
              onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
              placeholder="e.g. Opening Ceremony, Kids Corner, Day 1"
            />
          </div>
          <div>
            <label className="label" htmlFor="sec-desc">Description (optional)</label>
            <input
              id="sec-desc" className="input"
              value={sectionForm.description}
              onChange={(e) => setSectionForm({ ...sectionForm, description: e.target.value })}
              placeholder="What is shown in this section?"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="button" className="btn btn-secondary" onClick={() => setSectionModal(false)}>Cancel</button>
            <button className="btn btn-primary">{editingSection ? "Save Section" : "Create Section"}</button>
          </div>
        </form>
      </Modal>

      {/* move image modal */}
      <Modal open={!!moveTarget} onClose={() => setMoveTarget(null)} title="Move Image to Section">
        <div className="space-y-2">
          {moveTarget && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={moveTarget.public_url} alt="" className="rounded-xl w-full aspect-video object-cover mb-3" />
          )}
          {sections.map((s) => (
            <button
              key={s.id}
              className="w-full flex items-center gap-3 rounded-xl border p-3 text-left hover:border-blue-300 transition-colors"
              style={moveTarget?.section_id === s.id ? { borderColor: "var(--brand-ink)", background: "var(--brand-soft)" } : undefined}
              onClick={() => moveTarget && moveImage(moveTarget, s.id)}
            >
              <Folder size={16} className="text-slate-400 shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block text-[13.5px] font-medium truncate">{s.name}</span>
                <span className="block text-[11.5px] text-slate-500">{bySection.map.get(s.id)?.length ?? 0} images</span>
              </span>
              {moveTarget?.section_id === s.id && <span className="badge" style={{ background: "var(--brand)", color: "#fff" }}>current</span>}
            </button>
          ))}
          {moveTarget?.section_id && (
            <button
              className="w-full flex items-center gap-3 rounded-xl border border-dashed p-3 text-left hover:border-blue-300"
              onClick={() => moveTarget && moveImage(moveTarget, "")}
            >
              <Images size={16} className="text-slate-400" />
              <span className="text-[13.5px]">Unsectioned</span>
            </button>
          )}
        </div>
      </Modal>
    </div>
  );
}
