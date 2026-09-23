"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  CalendarDays, Users, UserCheck, Baby, Eye, Share2, MessageSquare, ThumbsUp,
  Contact, Handshake, Package, Trophy, Banknote, Radio, CheckCircle2, PlayCircle,
} from "lucide-react";
import { StatCard, PageHeader, StatusBadge, ProgressBar, Tag } from "@/components/ui/primitives";
import { BarChart, LineChart, DonutChart } from "@/components/ui/charts";
import { computeKpis, eventsOverTime, groupCount, channelBreakdown, attendanceByDay } from "@/lib/analytics";
import type { EventRow, EventGoal, DailyReport, Channel } from "@/lib/types";
import { formatNumber, formatMoney, dateRangeLabel } from "@/lib/utils";

export function DashboardClient({
  events, goals, dailyReports, contactsCount, partnershipsCount, materialsCount, channels, canViewFinancials,
}: {
  events: EventRow[];
  goals: (EventGoal & { events?: { id: string; name: string } | null })[];
  dailyReports: (DailyReport & { events?: { id: string; name: string } | null })[];
  contactsCount: number;
  partnershipsCount: number;
  materialsCount: number;
  channels: Channel[];
  canViewFinancials: boolean;
}) {
  const kpis = useMemo(
    () => computeKpis(events, contactsCount, partnershipsCount, materialsCount, goals),
    [events, contactsCount, partnershipsCount, materialsCount, goals],
  );

  const overTime = useMemo(() => eventsOverTime(events), [events]);
  const byCountry = useMemo(() => groupCount(events.filter((e) => e.status !== "Cancelled"), (e) => e.country), [events]);
  const byType = useMemo(() => groupCount(events, (e) => e.event_type), [events]);
  const byStatus = useMemo(() => groupCount(events, (e) => e.status), [events]);
  const byChannel = useMemo(() => channelBreakdown(events, channels), [events, channels]);
  const adultsChildren = useMemo(() => ({
    labels: ["Adults", "Children"],
    data: [kpis.adults, kpis.children],
  }), [kpis]);
  const recentReports = useMemo(() => dailyReports.slice(0, 30), [dailyReports]);
  const attendance = useMemo(() => attendanceByDay(recentReports), [recentReports]);
  const topGoals = useMemo(() => goals.slice(0, 6), [goals]);
  const upcoming = useMemo(
    () => events
      .filter((e) => ["Planning", "Confirmed", "In Progress"].includes(e.status) && e.end_date >= new Date().toISOString().slice(0, 10))
      .sort((a, b) => a.start_date.localeCompare(b.start_date))
      .slice(0, 5),
    [events],
  );

  const digitalTotals = useMemo(() => [
    { label: "Views", value: kpis.totalViews, color: "#2563eb" },
    { label: "Likes", value: kpis.likes, color: "#ec4899" },
    { label: "Comments", value: kpis.comments, color: "#0ea5e9" },
    { label: "Shares", value: kpis.shares, color: "#10b981" },
  ], [kpis]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Public engagement and channel performance at a glance."
        actions={
          <Link href="/events?new=1" className="btn btn-primary btn-sm">
            <CalendarDays size={15} /> New Event
          </Link>
        }
      />

      {/* KPI grid */}
      <div className="grid gap-4 stagger" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 215px), 1fr))" }}>
        <StatCard label="Total Events" value={kpis.totalEvents} icon={CalendarDays} tone="brand" hint={`${kpis.activeEvents} active · ${kpis.completedEvents} completed`} />
        <StatCard label="Active Events" value={kpis.activeEvents} icon={PlayCircle} tone="sky" />
        <StatCard label="Completed" value={kpis.completedEvents} icon={CheckCircle2} tone="green" />
        <StatCard label="Total Attendees" value={formatNumber(kpis.totalAttendees)} icon={Users} tone="brand" hint={canViewFinancials && kpis.costPerAttendee ? `${formatMoney(kpis.costPerAttendee)} / attendee` : undefined} />
        <StatCard label="Adults" value={formatNumber(kpis.adults)} icon={UserCheck} tone="violet" />
        <StatCard label="Children" value={formatNumber(kpis.children)} icon={Baby} tone="gold" />
        <StatCard label="Digital Views" value={formatNumber(kpis.totalViews)} icon={Eye} tone="sky" />
        <StatCard label="Shares" value={formatNumber(kpis.shares)} icon={Share2} tone="green" />
        <StatCard label="Comments" value={formatNumber(kpis.comments)} icon={MessageSquare} tone="violet" />
        <StatCard label="Likes" value={formatNumber(kpis.likes)} icon={ThumbsUp} tone="red" />
        <StatCard label="New Contacts" value={formatNumber(kpis.newContacts)} icon={Contact} tone="sky" />
        <StatCard label="New Partnerships" value={formatNumber(kpis.newPartnerships)} icon={Handshake} tone="brand" />
        <StatCard label="Materials Distributed" value={formatNumber(kpis.materialsDistributed)} icon={Package} tone="gold" />
        <StatCard label="Avg Attendance" value={formatNumber(kpis.avgAttendance)} icon={Users} tone="default" hint="per event" />
        <StatCard label="Goal Completion" value={`${Math.round(kpis.goalCompletion * 100)}%`} icon={Trophy} tone="green" />
        {canViewFinancials && (
          <StatCard label="Cost / Reach" value={kpis.costPerView ? formatMoney(kpis.costPerView) : "—"} icon={Banknote} tone="gold" hint={kpis.totalCost ? `Total spend ${formatMoney(kpis.totalCost)}` : undefined} />
        )}
      </div>

      {/* charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-semibold text-[14px] mb-4">Events & Attendance Over Time</h3>
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
          <h3 className="font-semibold text-[14px] mb-4">Adults vs Children</h3>
          <DonutChart labels={adultsChildren.labels} data={adultsChildren.data} colors={["#2563eb", "#f59e0b"]} height={250} />
        </div>
      </div>

      {/* charts row 2 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <h3 className="font-semibold text-[14px] mb-4">Events by Country</h3>
          <BarChart labels={byCountry.labels.slice(0, 8)} datasets={[{ label: "Events", data: byCountry.data.slice(0, 8) }]} horizontal height={240} />
        </div>
        <div className="card p-5">
          <h3 className="font-semibold text-[14px] mb-4">Events by Type</h3>
          <DonutChart labels={byType.labels} data={byType.data} height={240} />
        </div>
        <div className="card p-5">
          <h3 className="font-semibold text-[14px] mb-4">Events by Channel</h3>
          <BarChart labels={byChannel.labels} datasets={[{ label: "Events", data: byChannel.data, color: "#8b5cf6" }]} horizontal height={240} />
        </div>
      </div>

      {/* digital + status */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-semibold text-[14px] mb-4">Digital Engagement</h3>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 140px), 1fr))" }}>
            {digitalTotals.map((d) => (
              <div key={d.label} className="rounded-xl p-3" style={{ background: "var(--surface-2)" }}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{d.label}</p>
                <p className="text-[20px] font-bold mt-1 tabular-nums" style={{ color: d.color }}>{formatNumber(d.value)}</p>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <LineChart
              labels={overTime.labels}
              datasets={[{ label: "Views", data: overTime.labels.map((_, i) => events.filter((e) => {
                const d = new Date(); d.setMonth(d.getMonth() - (overTime.labels.length - 1 - i));
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                return e.start_date.startsWith(key);
              }).reduce((s, e) => s + e.views, 0)), color: "#2563eb" }]}
              area
              height={160}
            />
          </div>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold text-[14px] mb-4">Event Status</h3>
          <DonutChart labels={byStatus.labels} data={byStatus.data} height={240} />
        </div>
      </div>

      {/* goals + attendance by day + upcoming */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <h3 className="font-semibold text-[14px] mb-4">Goal Progress</h3>
          {topGoals.length === 0 ? (
            <p className="text-[13px] text-slate-400">No goals configured yet.</p>
          ) : (
            <div className="space-y-4">
              {topGoals.map((g) => (
                <div key={g.id}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-[12.5px] font-medium truncate">{g.goal}</p>
                    <StatusBadge status={g.status} />
                  </div>
                  <ProgressBar value={g.current_value} max={g.target} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-[14px] mb-4">Multi-Day Activity (recent daily reports)</h3>
          {attendance.labels.length === 0 ? (
            <p className="text-[13px] text-slate-400">No daily reports yet.</p>
          ) : (
            <BarChart
              labels={attendance.labels}
              datasets={[
                { label: "Adults", data: attendance.adults, color: "#2563eb" },
                { label: "Children", data: attendance.children, color: "#f59e0b" },
              ]}
              stacked
              height={240}
            />
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-[14px] mb-4">Upcoming & Active</h3>
          {upcoming.length === 0 ? (
            <p className="text-[13px] text-slate-400">Nothing scheduled — plan your next event.</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((e) => (
                <Link key={e.id} href={`/events/${e.id}`} className="block rounded-xl p-3 -mx-1 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold truncate">{e.name}</p>
                    <StatusBadge status={e.status} />
                  </div>
                  <p className="text-[12px] text-slate-500 mt-0.5">{dateRangeLabel(e.start_date, e.end_date)} · {e.city || e.country}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
