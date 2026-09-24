"use client";

import { useMemo, useState } from "react";
import type { EventRow, DailyReport, EventMaterial, EventPartnership } from "@/lib/types";
import { PageHeader, StatCard } from "@/components/ui/primitives";
import { formatNumber, formatMoney, downloadCsv } from "@/lib/utils";
import { FileBarChart, Download, FileText } from "lucide-react";

export function ReportsClient({
  events, dailyReports, materials, partnerships, canViewFinancials,
}: {
  events: EventRow[];
  dailyReports: (DailyReport & { events?: { id: string; name: string } | null })[];
  materials: (EventMaterial & { events?: { id: string; name: string; country: string } | null })[];
  partnerships: (EventPartnership & { events?: { id: string; name: string } | null })[];
  canViewFinancials: boolean;
}) {
  const [range, setRange] = useState({ from: "", to: "" });

  const inRange = <T extends { events?: { id: string } | null }>(rows: T[], dateOf: (r: T) => string) =>
    rows.filter((r) => (!range.from || dateOf(r) >= range.from) && (!range.to || dateOf(r) <= range.to));

  const filteredEvents = useMemo(() => events.filter((e) =>
    (!range.from || e.end_date >= range.from) && (!range.to || e.start_date <= range.to)), [events, range]);

  const exportEvents = () => downloadCsv("report-events.csv", filteredEvents.map((e) => ({
    Name: e.name, Status: e.status, Type: e.event_type, Start: e.start_date, End: e.end_date,
    City: e.city, Country: e.country, Adults: e.adults, Children: e.children,
    Views: e.views, Likes: e.likes, Comments: e.comments_count, Shares: e.shares,
    ...(canViewFinancials ? { Budget: e.budget ?? "", ActualCost: e.actual_cost ?? "", Currency: e.currency } : {}),
  })));

  const exportAttendance = () => downloadCsv("report-attendance.csv", dailyReports.map((r) => ({
    Event: r.events?.name ?? "", Day: r.day_number, Date: r.report_date, Location: r.location,
    Staff: r.staff_present, Volunteers: r.volunteers, Adults: r.adults, Children: r.children, Total: r.adults + r.children,
  })));

  const exportMaterials = () => downloadCsv("report-materials.csv", materials.map((m) => ({
    Item: m.item, Quantity: m.quantity, Unit: m.unit, Event: m.events?.name ?? "", Country: m.events?.country ?? "",
  })));

  const exportPartnerships = () => downloadCsv("report-partnerships.csv", partnerships.map((p) => ({
    Organization: p.organization, Type: p.partnership_type, Status: p.status, Country: p.country,
    City: p.city, Contact: p.contact_person, FollowUp: p.follow_up_date ?? "", Event: p.events?.name ?? "",
  })));

  const cards = [
    { title: "Events Report", desc: "Full event list with attendance and digital metrics", count: filteredEvents.length, onExport: exportEvents },
    { title: "Attendance Report", desc: "Day-by-day attendance from daily reports", count: dailyReports.length, onExport: exportAttendance },
    { title: "Materials Report", desc: "All materials distributed by event and country", count: materials.length, onExport: exportMaterials },
    { title: "Partnerships Report", desc: "Partnership pipeline across all events", count: partnerships.length, onExport: exportPartnerships },
  ];

  const totalAttendees = filteredEvents.filter((e) => e.status !== "Cancelled").reduce((s, e) => s + e.adults + e.children, 0);
  const totalViews = filteredEvents.reduce((s, e) => s + e.views, 0);
  const totalCost = canViewFinancials ? filteredEvents.reduce((s, e) => s + (e.actual_cost ?? 0), 0) : null;

  return (
    <div className="space-y-5">
      <PageHeader title="Reports" description="Export data for management and stakeholder reporting." />

      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor="from">Date range (optional)</label>
          <input id="from" type="date" className="select" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="to">to</label>
          <input id="to" type="date" className="select" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
        </div>
        {(range.from || range.to) && (
          <button className="btn btn-ghost btn-sm" onClick={() => setRange({ from: "", to: "" })}>Clear</button>
        )}
      </div>

      <div className="grid gap-4 stagger" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 200px), 1fr))" }}>
        <StatCard label="Events in range" value={filteredEvents.length} icon={FileBarChart} tone="brand" />
        <StatCard label="Attendees" value={formatNumber(totalAttendees)} icon={FileBarChart} tone="violet" />
        <StatCard label="Digital Views" value={formatNumber(totalViews)} icon={FileBarChart} tone="sky" />
        {canViewFinancials && totalCost !== null && (
          <StatCard label="Total Cost" value={formatMoney(totalCost)} icon={FileBarChart} tone="gold" />
        )}
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))" }}>
        {cards.map((c) => (
          <div key={c.title} className="card card-hover p-5 flex flex-col">
            <div className="flex items-start justify-between mb-2">
              <FileText size={18} className="text-slate-400" />
              <span className="badge" style={{ background: "var(--surface-2)", color: "var(--muted)" }}>{c.count} rows</span>
            </div>
            <h3 className="font-semibold text-[14px]">{c.title}</h3>
            <p className="text-[12.5px] text-slate-500 mt-1 flex-1">{c.desc}</p>
            <button onClick={c.onExport} className="btn btn-secondary btn-sm mt-3 self-start">
              <Download size={14} /> Export CSV
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
