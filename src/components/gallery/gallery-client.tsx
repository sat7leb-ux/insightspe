"use client";

import { useState } from "react";
import Link from "next/link";
import type { GalleryImage } from "@/lib/types";
import { PageHeader, EmptyState } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";
import { Images, ChevronLeft, ChevronRight, X, Download } from "lucide-react";

export function GalleryClient({ images }: {
  images: (GalleryImage & { events?: { id: string; name: string } | null })[];
}) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  const nav = (dir: 1 | -1) => {
    if (lightbox === null) return;
    setLightbox((lightbox + dir + images.length) % images.length);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Gallery" description={`${images.length} image${images.length === 1 ? "" : "s"} across all events`} />

      {images.length === 0 ? (
        <div className="card"><EmptyState icon={Images} title="No gallery images yet" description="Upload photos from an event page to build the gallery." /></div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))" }}>
          {images.map((img, i) => (
            <div key={img.id} className="card card-hover overflow-hidden group">
              <button className="block w-full aspect-[4/3] overflow-hidden" onClick={() => setLightbox(i)} aria-label={`Open image from ${img.events?.name ?? "event"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.public_url} alt={img.caption || "Event image"} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
              </button>
              <div className="p-2.5">
                {img.events?.id && (
                  <Link href={`/events/${img.events.id}`} className="text-[12px] font-semibold text-blue-700 hover:underline truncate block">
                    {img.events.name}
                  </Link>
                )}
                <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(img.image_date ?? img.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

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
              {images[lightbox].events?.name && <p className="text-[14px] font-semibold">{images[lightbox].events.name}</p>}
              <p className="text-[12px] text-white/50">{images[lightbox].caption} · {lightbox + 1} / {images.length}</p>
            </div>
            <a href={images[lightbox].public_url} download target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm"><Download size={14} /> Download</a>
          </div>
        </div>
      )}
    </div>
  );
}
