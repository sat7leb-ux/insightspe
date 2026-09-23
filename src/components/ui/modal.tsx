"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export function Modal({
  open, onClose, title, children, wide,
}: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 overflow-y-auto"
      style={{ background: "rgba(15,23,42,0.45)", backdropFilter: "blur(2px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="card w-full fade-up my-auto"
        style={{ maxWidth: wide ? 900 : 560, boxShadow: "var(--shadow-pop)" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-[15px]">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="btn btn-ghost btn-sm">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 max-h-[calc(100vh-200px)] overflow-y-auto thin-scroll">{children}</div>
      </div>
    </div>
  );
}
