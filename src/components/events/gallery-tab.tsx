"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { GalleryImage } from "@/lib/types";
import { EmptyState } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { formatDate, safeFileName } from "@/lib/utils";
import { Images, Upload, X, Trash2, Star, Download, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

const MAX_SIZE = 8 * 1024 * 1024; // 8MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function GalleryTab({ eventId, images, canWrite, readOnly }: {
  eventId: string; images: GalleryImage[]; canWrite: boolean; readOnly?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [captionEdit, setCaptionEdit] = useState<GalleryImage | null>(null);
  const [caption, setCaption] = useState("");

  const uploadFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    const invalid = list.find((f) => !ALLOWED.includes(f.type) || f.size > MAX_SIZE);
    if (invalid) {
      toast(`${invalid.name}: only JPEG/PNG/WebP/GIF up to 8MB allowed.`, "error");
      return;
    }
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
      toast(`${ok} image${ok === 1 ? "" : "s"} uploaded successfully`);
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

  const nav = (dir: 1 | -1) => {
    if (lightbox === null) return;
    setLightbox((lightbox + dir + images.length) % images.length);
  };

  const featured = images.find((i) => i.is_featured);

  return (
    <div>
      {canWrite && (
        <div
          className="rounded-xl border-2 border-dashed p-6 text-center mb-4 transition-colors cursor-pointer"
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
          <input
            ref={inputRef} type="file" multiple accept={ALLOWED.join(",")} className="hidden"
            onChange={(e) => { if (e.target.files?.length) uploadFiles(e.target.files); e.target.value = ""; }}
          />
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-[13px] text-slate-600">
              <Loader2 size={16} className="animate-spin" />
              Uploading {uploading.done + 1} of {uploading.total}…
            </div>
          ) : (
            <>
              <Upload size={20} className="mx-auto text-slate-400 mb-2" />
              <p className="text-[13.5px] font-medium">Drag & drop images here, or click to select</p>
              <p className="text-[12px] text-slate-400 mt-1">JPEG, PNG, WebP or GIF · up to 8MB each</p>
            </>
          )}
        </div>
      )}

      {images.length === 0 ? (
        <EmptyState
          icon={Images}
          title="No gallery images"
          description={canWrite ? "Upload photos from this event to build its gallery." : "Photos uploaded for this event will appear here."}
        />
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 180px), 1fr))" }}>
          {images.map((img, i) => (
            <div key={img.id} className="card card-hover overflow-hidden group relative">
              <button
                className="block w-full aspect-[4/3] overflow-hidden"
                onClick={() => setLightbox(i)}
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
                      <button className="btn btn-ghost btn-sm !p-1" title={img.is_featured ? "Unfeature" : "Feature"} onClick={() => feature(img)}><Star size={12} className={img.is_featured ? "text-amber-500" : ""} /></button>
                      <button className="btn btn-ghost btn-sm !p-1 hover:!text-red-600" title="Delete" onClick={() => remove(img)}><Trash2 size={12} /></button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
                {formatDate(images[lightbox].image_date ?? images[lightbox].created_at)}
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
    </div>
  );
}
