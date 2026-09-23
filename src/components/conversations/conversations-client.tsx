"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Conversation } from "@/lib/types";
import { PageHeader, EmptyState, Tag, StatusBadge } from "@/components/ui/primitives";
import { formatDate, downloadCsv } from "@/lib/utils";
import { MessagesSquare, Search, Download } from "lucide-react";

export function ConversationsClient({ conversations, channels }: {
  conversations: (Conversation & { events?: { id: string; name: string } | null })[];
  channels: { id: string; name: string; color: string }[];
}) {
  const [q, setQ] = useState("");
  const [needsFollowUp, setNeedsFollowUp] = useState(false);

  const filtered = useMemo(() => {
    let list = conversations;
    if (q.trim()) { const t = q.toLowerCase(); list = list.filter((c) => c.summary.toLowerCase().includes(t) || c.person_name.toLowerCase().includes(t)); }
    if (needsFollowUp) list = list.filter((c) => c.is_follow_up_required);
    return list;
  }, [conversations, q, needsFollowUp]);

  const exportCsv = () => {
    downloadCsv("conversations.csv", filtered.map((c) => ({
      Person: c.person_name, Platform: c.platform, Country: c.country, Summary: c.summary,
      Messages: c.message_count, FollowUp: c.is_follow_up_required ? "Yes" : "No",
      Event: c.events?.name ?? "", Date: c.content_date ?? "",
    })));
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Conversations"
        description="Audience conversations linked to events and channels."
        actions={<button onClick={exportCsv} className="btn btn-secondary btn-sm"><Download size={14} /> Export CSV</button>}
      />

      <div className="card p-3 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search conversations…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search conversations" />
        </div>
        <label className="flex items-center gap-2 text-[13px] cursor-pointer px-2">
          <input type="checkbox" checked={needsFollowUp} onChange={(e) => setNeedsFollowUp(e.target.checked)} className="accent-blue-700" />
          Needs follow-up only
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="card"><EmptyState icon={MessagesSquare} title="No conversations" description="Conversations linked to events appear here." /></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const ch = channels.find((x) => x.id === c.channel_id);
            return (
              <div key={c.id} className="card card-hover p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-[13.5px]">{c.person_name || "Anonymous"}</p>
                      {ch && <Tag color={ch.color}>{ch.name}</Tag>}
                      {c.platform && <Tag>{c.platform}</Tag>}
                    </div>
                    <p className="text-[13px] text-slate-600 mt-1">{c.summary}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.is_follow_up_required && <StatusBadge status="Follow-up" />}
                    <span className="text-[11.5px] text-slate-400">{c.message_count} msg</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t">
                  <span className="text-[11.5px] text-slate-400">{c.country} · {formatDate(c.content_date)}</span>
                  {c.events?.id && (
                    <Link href={`/events/${c.events.id}`} className="text-[12px] font-medium text-blue-700 hover:underline">{c.events.name} →</Link>
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
