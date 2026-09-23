"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { EventSurvey } from "@/lib/types";
import { PageHeader, StatCard, EmptyState } from "@/components/ui/primitives";
import { BarChart } from "@/components/ui/charts";
import { formatNumber, downloadCsv } from "@/lib/utils";
import { MessageSquareHeart, Download, Star } from "lucide-react";

export function SurveysClient({ surveys }: {
  surveys: (EventSurvey & { events?: { id: string; name: string } | null })[];
}) {
  const [eventFilter, setEventFilter] = useState("");

  const events = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of surveys) if (s.events?.id) map.set(s.events.id, s.events.name);
    return [...map.entries()];
  }, [surveys]);

  const filtered = useMemo(() => eventFilter ? surveys.filter((s) => s.event_id === eventFilter) : surveys, [surveys, eventFilter]);

  const avg = (key: keyof EventSurvey) =>
    filtered.length ? (filtered.reduce((s, x) => s + (x[key] as number), 0) / filtered.length).toFixed(2) : "—";

  const wouldAgain = filtered.length
    ? Math.round((filtered.filter((s) => s.would_participate_again === "Yes").length / filtered.length) * 100)
    : 0;

  const ratingDist = (key: keyof EventSurvey) => {
    const counts = [0, 0, 0, 0, 0];
    for (const s of filtered) counts[(s[key] as number) - 1]++;
    return counts;
  };

  const exportCsv = () => {
    downloadCsv("survey-results.csv", filtered.map((s) => ({
      Event: s.events?.name ?? "", Respondent: s.respondent_name, Role: s.respondent_role,
      Overall: s.overall_experience, Organization: s.organization_rating,
      Communication: s.communication_rating, Value: s.event_value_rating,
      WouldAgain: s.would_participate_again, Worked: s.what_worked, Improve: s.what_to_improve,
      Comments: s.additional_comments, Submitted: s.submitted_at,
    })));
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Surveys"
        description="Post-event feedback from participants, partners and volunteers."
        actions={<button onClick={exportCsv} className="btn btn-secondary btn-sm"><Download size={14} /> Export CSV</button>}
      />

      {events.length > 1 && (
        <div className="card p-3">
          <select className="select" style={{ width: "auto" }} value={eventFilter} onChange={(e) => setEventFilter(e.target.value)} aria-label="Filter by event">
            <option value="">All Events</option>
            {events.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card"><EmptyState icon={MessageSquareHeart} title="No survey responses" description="Surveys are submitted from each event page." /></div>
      ) : (
        <>
          <div className="grid gap-4 stagger" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 190px), 1fr))" }}>
            <StatCard label="Responses" value={filtered.length} icon={MessageSquareHeart} tone="brand" />
            <StatCard label="Overall Experience" value={`${avg("overall_experience")}/5`} icon={Star} tone="gold" />
            <StatCard label="Organization" value={`${avg("organization_rating")}/5`} icon={Star} tone="green" />
            <StatCard label="Communication" value={`${avg("communication_rating")}/5`} icon={Star} tone="sky" />
            <StatCard label="Event Value" value={`${avg("event_value_rating")}/5`} icon={Star} tone="violet" />
            <StatCard label="Would Join Again" value={`${wouldAgain}%`} icon={MessageSquareHeart} tone="green" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {([["Overall Experience", "overall_experience"], ["Organization", "organization_rating"], ["Communication", "communication_rating"], ["Event Value", "event_value_rating"]] as const).map(([label, key]) => (
              <div key={key} className="card p-5">
                <h3 className="font-semibold text-[14px] mb-4">{label} — distribution</h3>
                <BarChart
                  labels={["1 ★", "2 ★", "3 ★", "4 ★", "5 ★"]}
                  datasets={[{ label: "Responses", data: ratingDist(key), color: "#f59e0b" }]}
                  height={200}
                />
              </div>
            ))}
          </div>

          <div className="card overflow-hidden">
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Event</th><th>Respondent</th><th className="text-center">Overall</th><th className="text-center">Org</th><th className="text-center">Comm</th><th className="text-center">Value</th><th>Again?</th></tr></thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id}>
                      <td>
                        {s.events?.id ? <Link href={`/events/${s.events.id}`} className="text-blue-700 hover:underline font-medium">{s.events.name}</Link> : "—"}
                      </td>
                      <td>{s.respondent_name || "Anonymous"} <span className="text-slate-400">· {s.respondent_role}</span></td>
                      <td className="text-center tabular-nums">{s.overall_experience}/5</td>
                      <td className="text-center tabular-nums">{s.organization_rating}/5</td>
                      <td className="text-center tabular-nums">{s.communication_rating}/5</td>
                      <td className="text-center tabular-nums">{s.event_value_rating}/5</td>
                      <td className="font-medium">{s.would_participate_again}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
