"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { EventRow, EventGoal, Channel, Partner } from "@/lib/types";
import { PageHeader, StatCard, EmptyState } from "@/components/ui/primitives";
import { BarChart, LineChart, DonutChart } from "@/components/ui/charts";
import { FilterBar } from "@/components/events/filter-bar";
import { computeKpis, eventsOverTime, groupCount, channelBreakdown } from "@/lib/analytics";
import type { Profile } from "@/lib/types";
import { formatNumber, formatMoney, downloadCsv } from "@/lib/utils";
import { BarChart3, Download, Eye, Users, Handshake, Package } from "lucide-react";

export function AnalyticsClient({
  events, goals, channels, partners, profiles, canViewFinancials,
}: {
  events: EventRow[]; goals: (EventGoal & { events?: { id: string; name: string } | null })[];
  channels: Channel[]; partners: Partner[]; profiles: Profile[]; canViewFinancials: boolean;
}) {
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState({ country: "", eventType: "", partner: "", channel: "", status: "", manager: "", campaign: "", dateFrom: "", dateTo: "" });

  const filtered = useMemo(() => {
    let list = events;
    if (q.trim()) { const t = q.toLowerCase(); list = list.filter((e) => e.name.toLowerCase().includes(t)); }
    if (filters.country) list = list.filter((e) => e.country === filters.country);
    if (filters.eventType) list = list.filter((e) => e.event_type === filters.eventType);
    if (filters.partner) list = list.filter((e) => e.partner_id === filters.partner);
    if (filters.channel) list = list.filter((e) => e.channel_ids.includes(filters.channel));
    if (filters.status) list = list.filter((e) => e.status === filters.status);
    if (filters.manager) list = list.filter((e) => e.manager_id === filters.manager);
    if (filters.dateFrom) list = list.filter((e) => e.end_date >= filters.dateFrom);
    if (filters.dateTo) list = list.filter((e) => e.start_date <= filters.dateTo);
    return list;
  }, [events, q, filters]);

  const kpis = useMemo(() => computeKpis(filtered, 0, 0, 0, goals), [filtered, goals]);

  const byCountry = useMemo(() => {
    const map = new Map<string, { events: number; attendees: number; views: number }>();
    for (const e of filtered) {
      if (e.status === "Cancelled") continue;
      const k = e.country || "—";
      const cur = map.get(k) ?? { events: 0, attendees: 0, views: 0 };
      map.set(k, { events: cur.events + 1, attendees: cur.attendees + e.adults + e.children, views: cur.views + e.views });
    }
    return [...map.entries()].sort((a, b) => b[1].attendees - a[1].attendees);
  }, [filtered]);

  const byType = useMemo(() => groupCount(filtered, (e) => e.event_type), [filtered]);
  const byChannel = useMemo(() => channelBreakdown(filtered, channels), [filtered, channels]);
  const byPartner = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filtered) {
      if (e.status === "Cancelled" || !e.partner_id) continue;
      const name = partners.find((p) => p.id === e.partner_id)?.name ?? "—";
      map.set(name, (map.get(name) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [filtered, partners]);

  const overTime = useMemo(() => eventsOverTime(filtered, 12), [filtered]);

  const exportCsv = () => {
    downloadCsv("analytics.csv", byCountry.map(([country, v]) => ({
      Country: country, Events: v.events, Attendees: v.attendees, Views: v.views,
      AvgAttendance: v.events ? Math.round(v.attendees / v.events) : 0,
    })));
  };

  const summary = useMemo(() => {
    const completed = filtered.filter((e) => e.status === "Completed");
    return `${filtered.length} events analyzed across ${byCountry.length} countries. ` +
      `${completed.length} completed with ${formatNumber(kpis.totalAttendees)} total attendees and ${formatNumber(kpis.totalViews)} digital views. ` +
      (byCountry.length ? `Top country by attendance: ${byCountry[0][0]}.` : "");
  }, [filtered, byCountry, kpis]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Analytics"
        description="Cross-cutting analysis of public engagement."
        actions={<button onClick={exportCsv} className="btn btn-secondary btn-sm"><Download size={14} /> Export CSV</button>}
      />

      <FilterBar
        q={q} setQ={setQ} filters={filters} setFilters={setFilters}
        countries={[...new Set(events.map((e) => e.country).filter(Boolean))].sort()}
        eventTypes={[...new Set(events.map((e) => e.event_type))]}
        partners={partners} channels={channels} profiles={profiles}
        campaigns={[...new Set(events.map((e) => e.campaign_tag).filter(Boolean))]}
      />

      {/* management summary */}
      <div className="card p-4" style={{ background: "var(--brand-soft)", borderColor: "#bfdbfe" }}>
        <p className="text-[13.5px] leading-relaxed" style={{ color: "#1e3a8a" }}>{summary}</p>
      </div>

      {filtered.length === 0 ? (
        <div className="card"><EmptyState icon={BarChart3} title="No data for these filters" description="Adjust the filters to see analytics." /></div>
      ) : (
        <>
          <div className="grid gap-4 stagger" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 200px), 1fr))" }}>
            <StatCard label="Events" value={filtered.length} icon={BarChart3} tone="brand" />
            <StatCard label="Attendees" value={formatNumber(kpis.totalAttendees)} icon={Users} tone="violet" />
            <StatCard label="Digital Views" value={formatNumber(kpis.totalViews)} icon={Eye} tone="sky" />
            <StatCard label="Goal Completion" value={`${Math.round(kpis.goalCompletion * 100)}%`} icon={Handshake} tone="green" />
            {canViewFinancials && <StatCard label="Total Budget" value={kpis.totalBudget ? formatMoney(kpis.totalBudget) : "—"} icon={Package} tone="gold" />}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card p-5">
              <h3 className="font-semibold text-[14px] mb-4">Events Over Time (12 months)</h3>
              <BarChart labels={overTime.labels} datasets={[{ label: "Events", data: overTime.counts }]} height={240} />
            </div>
            <div className="card p-5">
              <h3 className="font-semibold text-[14px] mb-4">Attendance Over Time</h3>
              <LineChart labels={overTime.labels} datasets={[{ label: "Attendees", data: overTime.attendees, color: "#f59e0b" }]} area height={240} />
            </div>
            <div className="card p-5">
              <h3 className="font-semibold text-[14px] mb-4">Events by Channel</h3>
              <DonutChart labels={byChannel.labels} data={byChannel.data} height={240} />
            </div>
            <div className="card p-5">
              <h3 className="font-semibold text-[14px] mb-4">Events by Type</h3>
              <DonutChart labels={byType.labels} data={byType.data} asPie height={240} />
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-[14px] mb-4">Country Breakdown</h3>
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Country</th><th className="text-right">Events</th><th className="text-right">Attendees</th><th className="text-right">Views</th><th className="text-right">Avg Attendance</th></tr></thead>
                <tbody>
                  {byCountry.map(([country, v]) => (
                    <tr key={country}>
                      <td className="font-medium">
                        <Link href={`/events?country=${encodeURIComponent(country)}`} className="hover:text-blue-700 hover:underline">{country}</Link>
                      </td>
                      <td className="text-right tabular-nums">{v.events}</td>
                      <td className="text-right tabular-nums">{formatNumber(v.attendees)}</td>
                      <td className="text-right tabular-nums">{formatNumber(v.views)}</td>
                      <td className="text-right tabular-nums">{v.events ? formatNumber(Math.round(v.attendees / v.events)) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {byPartner.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-[14px] mb-4">Top Partners</h3>
              <BarChart labels={byPartner.map((x) => x[0])} datasets={[{ label: "Events", data: byPartner.map((x) => x[1]) }]} horizontal height={Math.max(200, byPartner.length * 36)} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
