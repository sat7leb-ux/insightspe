"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { EventRow, Channel, DailyReport, EventMaterial, EventPartnership } from "@/lib/types";
import { PageHeader, StatCard, StatusBadge, Tag, ProgressBar } from "@/components/ui/primitives";
import { BarChart, LineChart, DonutChart } from "@/components/ui/charts";
import { computeKpis, eventsOverTime, groupCount, channelBreakdown } from "@/lib/analytics";
import { formatNumber, formatMoney, dateRangeLabel, eventDays } from "@/lib/utils";
import { Radio, Users, Eye, Handshake, Package, Contact, CalendarDays, ArrowRight } from "lucide-react";

export function PublicEngagementClient({
  events, goals, dailyReports, materials, partnerships, contactsCount, followsCount, channels, canViewFinancials,
}: {
  events: EventRow[];
  goals: { target: number; current_value: number }[];
  dailyReports: (DailyReport & { events?: { id: string; name: string } | null })[];
  materials: (EventMaterial & { events?: { id: string; name: string; country: string } | null })[];
  partnerships: (EventPartnership & { events?: { id: string; name: string } | null })[];
  contactsCount: number;
  followsCount: number;
  channels: Channel[];
  canViewFinancials: boolean;
}) {
  // Only offline/hybrid activities (exclude pure digital campaigns)
  const offline = useMemo(() => events.filter((e) => e.event_type !== "Digital Campaign"), [events]);
  const digital = useMemo(() => events.filter((e) => e.event_type === "Digital Campaign"), [events]);

  const kpis = useMemo(() => computeKpis(offline, contactsCount, partnerships.length, materials.reduce((s, m) => s + Number(m.quantity), 0), goals), [offline, contactsCount, partnerships, materials, goals]);

  const overTime = useMemo(() => eventsOverTime(offline, 8), [offline]);
  const byType = useMemo(() => groupCount(offline, (e) => e.event_type), [offline]);
  const byChannel = useMemo(() => channelBreakdown(offline, channels), [offline, channels]);
  const byCountry = useMemo(() => groupCount(offline.filter((e) => e.status !== "Cancelled"), (e) => e.country), [offline]);

  const offlineVsDigital = useMemo(() => ({
    labels: ["Offline Reach (attendees)", "Digital Reach (views)"],
    data: [kpis.totalAttendees, offline.reduce((s, e) => s + e.views, 0)],
  }), [kpis, offline]);

  const recentReports = useMemo(() => dailyReports.slice(0, 20), [dailyReports]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Public Engagement"
        description="Offline and hybrid outreach — church partnerships, school visits, festivals, conferences, campaigns and community outreach — alongside digital performance."
      />

      {/* hero strip */}
      <div className="card p-5" style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #172554 100%)", border: "none", color: "#fff" }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-blue-300">This quarter at a glance</p>
            <p className="text-[26px] font-bold mt-1">
              {formatNumber(kpis.totalAttendees)} people reached on the ground
            </p>
            <p className="text-[13px] text-blue-200 mt-1">
              across {kpis.totalEvents} events in {byCountry.labels.length} countries · {formatNumber(offline.reduce((s, e) => s + e.views, 0))} digital views amplifying the impact
            </p>
          </div>
          <Link href="/events?new=1" className="btn btn-sm" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
            <CalendarDays size={14} /> Log an Event
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 stagger" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 200px), 1fr))" }}>
        <StatCard label="Offline Events" value={kpis.totalEvents} icon={Radio} tone="brand" hint={`${kpis.activeEvents} active · ${kpis.completedEvents} completed`} />
        <StatCard label="Total Attendees" value={formatNumber(kpis.totalAttendees)} icon={Users} tone="violet" hint={`${formatNumber(kpis.adults)} adults · ${formatNumber(kpis.children)} children`} />
        <StatCard label="Digital Amplification" value={formatNumber(offline.reduce((s, e) => s + e.views, 0))} icon={Eye} tone="sky" hint="views from offline events" />
        <StatCard label="New Contacts" value={formatNumber(contactsCount)} icon={Contact} tone="sky" />
        <StatCard label="Partnerships" value={partnerships.length} icon={Handshake} tone="green" />
        <StatCard label="Materials Distributed" value={formatNumber(materials.reduce((s, m) => s + Number(m.quantity), 0))} icon={Package} tone="gold" />
        <StatCard label="New Social Follows" value={formatNumber(followsCount)} icon={Radio} tone="red" />
        {canViewFinancials && kpis.totalCost !== null && (
          <StatCard label="Cost / Attendee" value={kpis.costPerAttendee ? formatMoney(kpis.costPerAttendee) : "—"} icon={Radio} tone="gold" />
        )}
      </div>

      {/* offline vs digital */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-semibold text-[14px] mb-4">Offline Activity Over Time</h3>
          <LineChart
            labels={overTime.labels}
            datasets={[
              { label: "Events", data: overTime.counts, color: "#2563eb" },
              { label: "Attendees", data: overTime.attendees, color: "#f59e0b" },
            ]}
            area
            height={250}
          />
        </div>
        <div className="card p-5">
          <h3 className="font-semibold text-[14px] mb-4">Offline vs Digital Reach</h3>
          <DonutChart labels={offlineVsDigital.labels} data={offlineVsDigital.data} colors={["#2563eb", "#0ea5e9"]} height={250} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <h3 className="font-semibold text-[14px] mb-4">By Engagement Type</h3>
          <DonutChart labels={byType.labels} data={byType.data} height={250} />
        </div>
        <div className="card p-5">
          <h3 className="font-semibold text-[14px] mb-4">Channels Involved</h3>
          <BarChart labels={byChannel.labels} datasets={[{ label: "Events", data: byChannel.data, color: "#8b5cf6" }]} horizontal height={250} />
        </div>
        <div className="card p-5">
          <h3 className="font-semibold text-[14px] mb-4">Countries</h3>
          <BarChart labels={byCountry.labels.slice(0, 7)} datasets={[{ label: "Events", data: byCountry.data.slice(0, 7) }]} horizontal height={250} />
        </div>
      </div>

      {/* recent daily activity + goals */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="font-semibold text-[14px] mb-4">Recent Field Reports</h3>
          {recentReports.length === 0 ? (
            <p className="text-[13px] text-slate-400">No daily reports yet.</p>
          ) : (
            <div className="space-y-2.5">
              {recentReports.slice(0, 6).map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border p-3">
                  <div className="w-8 h-8 rounded-lg grid place-items-center shrink-0 font-bold text-[12px]" style={{ background: "var(--brand-soft)", color: "#1e40af" }}>
                    D{r.day_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate">{r.events?.name ?? "Event"}</p>
                    <p className="text-[11.5px] text-slate-500">{r.adults + r.children} attendees · {r.contacts_collected} contacts · {r.materials_distributed} materials</p>
                  </div>
                  {r.events?.id && (
                    <Link href={`/events/${r.events.id}`} className="btn btn-ghost btn-sm" aria-label="Open event"><ArrowRight size={14} /></Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-[14px] mb-4">Partnership Pipeline</h3>
          {partnerships.length === 0 ? (
            <p className="text-[13px] text-slate-400">No partnerships tracked yet.</p>
          ) : (
            <div className="space-y-3">
              {(["Prospect", "Contacted", "Meeting", "Negotiation", "Active"] as const).map((stage) => {
                const items = partnerships.filter((p) => p.status === stage);
                if (items.length === 0) return null;
                return (
                  <div key={stage}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[12px] font-semibold text-slate-600">{stage}</p>
                      <span className="text-[12px] text-slate-400 tabular-nums">{items.length}</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                      <div className="h-full rounded-full" style={{ width: `${(items.length / partnerships.length) * 100}%`, background: "#10b981" }} />
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 border-t space-y-2">
                {partnerships.slice(0, 4).map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 text-[12.5px]">
                    <span className="truncate font-medium">{p.organization}</span>
                    <StatusBadge status={p.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* upcoming offline events */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[14px]">Upcoming & Active Engagement</h3>
          <Link href="/events" className="text-[12.5px] font-medium text-blue-700 hover:underline">All events →</Link>
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))" }}>
          {offline
            .filter((e) => ["Planning", "Confirmed", "In Progress"].includes(e.status))
            .sort((a, b) => a.start_date.localeCompare(b.start_date))
            .slice(0, 4)
            .map((e) => (
              <Link key={e.id} href={`/events/${e.id}`} className="rounded-xl border p-4 hover:border-blue-300 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-[13.5px]">{e.name}</p>
                  <StatusBadge status={e.status} />
                </div>
                <p className="text-[12px] text-slate-500 mt-1">{dateRangeLabel(e.start_date, e.end_date)}{eventDays(e.start_date, e.end_date) > 1 ? ` · ${eventDays(e.start_date, e.end_date)} days` : ""}</p>
                <p className="text-[12px] text-slate-500">{[e.city, e.country].filter(Boolean).join(", ")}</p>
                <div className="flex gap-1 mt-2">
                  {e.channel_ids.slice(0, 3).map((cid) => {
                    const ch = channels.find((c) => c.id === cid);
                    return ch ? <Tag key={cid} color={ch.color}>{ch.name}</Tag> : null;
                  })}
                </div>
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
