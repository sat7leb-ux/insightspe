"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Testimony } from "@/lib/types";
import { PageHeader, EmptyState, Tag } from "@/components/ui/primitives";
import { formatDate, downloadCsv } from "@/lib/utils";
import { MessageSquareQuote, Search, Download, Heart } from "lucide-react";

export function TestimoniesClient({ testimonies, channels }: {
  testimonies: (Testimony & { events?: { id: string; name: string } | null })[];
  channels: { id: string; name: string; color: string }[];
}) {
  const [q, setQ] = useState("");
  const [channel, setChannel] = useState("");

  const filtered = useMemo(() => {
    let list = testimonies;
    if (q.trim()) { const t = q.toLowerCase(); list = list.filter((x) => x.summary.toLowerCase().includes(t) || x.author_name.toLowerCase().includes(t) || x.full_text.toLowerCase().includes(t)); }
    if (channel) list = list.filter((x) => x.channel_id === channel);
    return list;
  }, [testimonies, q, channel]);

  const exportCsv = () => {
    downloadCsv("testimonies.csv", filtered.map((t) => ({
      Author: t.author_name, Country: t.country, Summary: t.summary, FullText: t.full_text,
      Event: t.events?.name ?? "", Date: t.content_date ?? "", Public: t.is_public ? "Yes" : "No",
    })));
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Testimonies"
        description="Life-impact stories linked to events and channels."
        actions={<button onClick={exportCsv} className="btn btn-secondary btn-sm"><Download size={14} /> Export CSV</button>}
      />

      <div className="card p-3 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search testimonies…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search testimonies" />
        </div>
        <select className="select" style={{ width: "auto" }} value={channel} onChange={(e) => setChannel(e.target.value)} aria-label="Filter by channel">
          <option value="">All Channels</option>
          {channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card"><EmptyState icon={MessageSquareQuote} title="No testimonies" description="Testimonies linked to events appear here." /></div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))" }}>
          {filtered.map((t) => {
            const ch = channels.find((c) => c.id === t.channel_id);
            return (
              <div key={t.id} className="card card-hover p-5 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-semibold text-[13.5px]">{t.author_name || "Anonymous"}</p>
                  {ch && <Tag color={ch.color}>{ch.name}</Tag>}
                </div>
                <p className="text-[13px] text-slate-600 line-clamp-3 flex-1">“{t.summary}”</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <span className="text-[11.5px] text-slate-400">{t.country} · {formatDate(t.content_date)}</span>
                  {t.events?.id && (
                    <Link href={`/events/${t.events.id}`} className="text-[12px] font-medium text-blue-700 hover:underline">{t.events.name} →</Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
