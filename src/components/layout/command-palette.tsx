"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Search, X, CalendarDays, Users, Building2, Megaphone, FileText, Hash } from "lucide-react";

interface SearchHit {
  type: "event" | "partner" | "user" | "campaign" | "country" | "report";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

const TYPE_ICONS: Record<SearchHit["type"], React.ReactNode> = {
  event: <CalendarDays size={15} />,
  partner: <Building2 size={15} />,
  user: <Users size={15} />,
  campaign: <Megaphone size={15} />,
  country: <Hash size={15} />,
  report: <FileText size={15} />,
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
    else { setQ(""); setResults([]); setActive(0); }
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim() || q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const sb = createClient();
        const term = q.trim();
        const [ev, pa, us] = await Promise.all([
          sb.from("events").select("id, name, country, city, start_date").ilike("name", `%${term}%`).neq("status", "Archived").limit(6),
          sb.from("partners").select("id, name, country, partner_type").ilike("name", `%${term}%`).limit(4),
          sb.from("profiles").select("id, full_name, email, role").or(`full_name.ilike.%${term}%,email.ilike.%${term}%`).limit(4),
        ]);
        const hits: SearchHit[] = [
          ...(ev.data ?? []).map((e) => ({
            type: "event" as const, id: e.id, title: e.name,
            subtitle: [e.city, e.country].filter(Boolean).join(", "),
            href: `/events/${e.id}`,
          })),
          ...(pa.data ?? []).map((p) => ({
            type: "partner" as const, id: p.id, title: p.name,
            subtitle: `${p.partner_type} · ${p.country}`,
            href: `/events?partner=${p.id}`,
          })),
          ...(us.data ?? []).map((u) => ({
            type: "user" as const, id: u.id, title: u.full_name,
            subtitle: u.email,
            href: `/users?q=${encodeURIComponent(u.full_name)}`,
          })),
        ];
        // campaigns by tag
        const { data: camps } = await sb.from("events").select("campaign_tag").ilike("campaign_tag", `%${term}%`).neq("campaign_tag", "").limit(3);
        const uniqueTags = [...new Set((camps ?? []).map((c) => c.campaign_tag).filter(Boolean))].slice(0, 3);
        for (const tag of uniqueTags) {
          hits.push({ type: "campaign", id: tag, title: tag, subtitle: "Campaign tag", href: `/events?campaign=${encodeURIComponent(tag)}` });
        }
        setResults(hits);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center pt-[12vh] px-4"
      style={{ background: "rgba(15,23,42,0.45)", backdropFilter: "blur(2px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
      role="dialog"
      aria-modal="true"
      aria-label="Global search"
    >
      <div className="card w-full fade-up overflow-hidden" style={{ maxWidth: 600, boxShadow: "var(--shadow-pop)" }}>
        <div className="flex items-center gap-3 px-4 border-b">
          <Search size={17} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              if (e.key === "Enter" && results[active]) { e.preventDefault(); go(results[active].href); }
            }}
            placeholder="Search events, partners, users, campaigns…"
            className="flex-1 py-3.5 outline-none bg-transparent text-[14px]"
            aria-label="Search"
          />
          <button onClick={() => setOpen(false)} aria-label="Close search" className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[55vh] overflow-y-auto thin-scroll">
          {loading && <p className="px-4 py-6 text-[13px] text-slate-400">Searching…</p>}
          {!loading && q.length >= 2 && results.length === 0 && (
            <p className="px-4 py-6 text-[13px] text-slate-400">No results for “{q}”.</p>
          )}
          {!loading && q.length < 2 && (
            <p className="px-4 py-6 text-[13px] text-slate-400">Type at least 2 characters. Search events, partners, users and campaigns.</p>
          )}
          {results.map((r, i) => (
            <button
              key={`${r.type}-${r.id}`}
              onClick={() => go(r.href)}
              onMouseEnter={() => setActive(i)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
              style={{ background: i === active ? "var(--surface-2)" : "transparent" }}
            >
              <span className="text-slate-400">{TYPE_ICONS[r.type]}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13.5px] font-medium truncate">{r.title}</span>
                <span className="block text-[12px] text-slate-500 truncate">{r.subtitle}</span>
              </span>
              <span className="badge" style={{ background: "var(--surface-2)", color: "var(--muted)" }}>{r.type}</span>
            </button>
          ))}
        </div>
        <div className="px-4 py-2.5 border-t flex items-center gap-4 text-[11px] text-slate-400">
          <span><kbd className="px-1.5 py-0.5 rounded border bg-slate-50">↑↓</kbd> navigate</span>
          <span><kbd className="px-1.5 py-0.5 rounded border bg-slate-50">Enter</kbd> open</span>
          <span><kbd className="px-1.5 py-0.5 rounded border bg-slate-50">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
