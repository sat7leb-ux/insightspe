"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { DailyReport } from "@/lib/types";
import { PageHeader, EmptyState, StatusBadge } from "@/components/ui/primitives";
import { formatDate, formatDateTime, downloadCsv } from "@/lib/utils";
import { ClipboardList, Download, Search } from "lucide-react";

export function DailyReportsClient({ reports }: {
  reports: (DailyReport & { events?: { id: string; name: string } | null })[];
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q.trim()) return reports;
    const t = q.toLowerCase();
    return reports.filter((r) =>
      (r.events?.name ?? "").toLowerCase().includes(t) ||
      r.location.toLowerCase().includes(t) ||
      r.activities.toLowerCase().includes(t) ||
      r.problems.toLowerCase().includes(t));
  }, [reports, q]);

  const exportCsv = () => {
    downloadCsv("daily-reports.csv", filtered.map((r) => ({
      Event: r.events?.name ?? "", Day: r.day_number, Date: r.report_date, Location: r.location,
      Staff: r.staff_present, Volunteers: r.volunteers, Adults: r.adults, Children: r.children,
      Total: r.adults + r.children, Contacts: r.contacts_collected,
      Partnerships: r.partnerships_discussed, Materials: r.materials_distributed,
      Problems: r.problems, Successes: r.successes, FollowUp: r.follow_up_actions,
    })));
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Daily Reports"
        description={`${reports.length} report${reports.length === 1 ? "" : "s"} across all events`}
        actions={<button onClick={exportCsv} className="btn btn-secondary btn-sm"><Download size={14} /> Export CSV</button>}
      />

      <div className="card p-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search reports by event, location, activities…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search daily reports" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card"><EmptyState icon={ClipboardList} title="No daily reports" description="Reports are submitted from each event page, one per day." /></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <details key={r.id} className="card overflow-hidden">
              <summary className="flex flex-wrap items-center gap-3 px-4 py-3.5 cursor-pointer list-none hover:bg-slate-50">
                <div className="w-9 h-9 rounded-xl grid place-items-center shrink-0 font-bold text-[13px]" style={{ background: "var(--brand-soft)", color: "#1e40af" }}>
                  {r.day_number}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[13.5px] truncate">
                    {r.events?.name ?? "Event"} — Day {r.day_number}
                  </p>
                  <p className="text-[12px] text-slate-500">{formatDate(r.report_date)} · {r.location || "—"} · {r.adults + r.children} attendees</p>
                </div>
                {r.problems && <StatusBadge status="At Risk" />}
                {r.follow_up_actions && <StatusBadge status="Follow-up" />}
              </summary>
              <div className="px-4 pb-4 pt-1 border-t">
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3">
                  {[
                    ["Staff", r.staff_present], ["Volunteers", r.volunteers], ["Adults", r.adults],
                    ["Children", r.children], ["Contacts", r.contacts_collected], ["Materials", r.materials_distributed],
                  ].map(([l, v]) => (
                    <div key={String(l)} className="rounded-lg p-2 text-center" style={{ background: "var(--surface-2)" }}>
                      <p className="text-[10px] text-slate-500 uppercase font-bold">{l}</p>
                      <p className="font-bold text-[15px] tabular-nums">{v}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 space-y-2 text-[13px]">
                  {([["Activities", r.activities], ["Meetings", r.meetings], ["Digital Engagement", r.digital_engagement], ["Successes", r.successes], ["Problems", r.problems], ["Follow-up Actions", r.follow_up_actions], ["Comments", r.comments]] as const)
                    .filter(([, v]) => v).map(([l, v]) => (
                      <div key={l}>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{l}</p>
                        <p className="text-slate-700 whitespace-pre-wrap">{v}</p>
                      </div>
                    ))}
                </div>
                {r.events?.id && (
                  <Link href={`/events/${r.events.id}`} className="btn btn-secondary btn-sm mt-3">Open event →</Link>
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
