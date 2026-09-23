"use client";

import { Search, X, SlidersHorizontal } from "lucide-react";
import type { Partner, Channel, Profile } from "@/lib/types";
import { EVENT_STATUSES } from "@/lib/types";

export interface FilterValues {
  country: string;
  eventType: string;
  partner: string;
  channel: string;
  status: string;
  manager: string;
  campaign: string;
  dateFrom: string;
  dateTo: string;
}

export function FilterBar({
  q, setQ, filters, setFilters, countries, eventTypes, partners, channels, profiles, campaigns,
  showArchived, setShowArchived,
}: {
  q: string; setQ: (v: string) => void;
  filters: FilterValues; setFilters: (f: FilterValues) => void;
  countries: string[];
  eventTypes: string[];
  partners: Partner[];
  channels: Channel[];
  profiles: Profile[];
  campaigns: string[];
  showArchived?: boolean; setShowArchived?: (v: boolean) => void;
}) {
  const set = (k: keyof FilterValues, v: string) => setFilters({ ...filters, [k]: v });
  const activeCount = Object.values(filters).filter(Boolean).length + (q ? 1 : 0);

  return (
    <div className="card p-3 sm:p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search events…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search events"
          />
        </div>
        <div className="flex items-center gap-2 text-[12px] text-slate-500">
          <SlidersHorizontal size={14} />
          <span className="tabular-nums">{activeCount} filter{activeCount === 1 ? "" : "s"}</span>
          {activeCount > 0 && (
            <button
              className="text-blue-700 font-medium hover:underline"
              onClick={() => { setFilters({ country: "", eventType: "", partner: "", channel: "", status: "", manager: "", campaign: "", dateFrom: "", dateTo: "" }); setQ(""); }}
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        <select className="select" value={filters.country} onChange={(e) => set("country", e.target.value)} aria-label="Filter by country">
          <option value="">All Countries</option>
          {countries.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="select" value={filters.eventType} onChange={(e) => set("eventType", e.target.value)} aria-label="Filter by type">
          <option value="">All Types</option>
          {eventTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="select" value={filters.status} onChange={(e) => set("status", e.target.value)} aria-label="Filter by status">
          <option value="">All Statuses</option>
          {EVENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="select" value={filters.partner} onChange={(e) => set("partner", e.target.value)} aria-label="Filter by partner">
          <option value="">All Partners</option>
          {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="select" value={filters.channel} onChange={(e) => set("channel", e.target.value)} aria-label="Filter by channel">
          <option value="">All Channels</option>
          {channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="select" value={filters.manager} onChange={(e) => set("manager", e.target.value)} aria-label="Filter by manager">
          <option value="">All Managers</option>
          {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </select>
        <input className="select" list="campaign-list" value={filters.campaign} onChange={(e) => set("campaign", e.target.value)} placeholder="Campaign" aria-label="Filter by campaign" />
        <datalist id="campaign-list">{campaigns.map((c) => <option key={c} value={c} />)}</datalist>
        <input type="date" className="select" value={filters.dateFrom} onChange={(e) => set("dateFrom", e.target.value)} aria-label="From date" title="Date from" />
        <input type="date" className="select" value={filters.dateTo} onChange={(e) => set("dateTo", e.target.value)} aria-label="To date" title="Date to" />
      </div>

      {setShowArchived && (
        <label className="flex items-center gap-2 text-[12.5px] text-slate-600 cursor-pointer select-none">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="accent-blue-700" />
          Include archived events
        </label>
      )}
    </div>
  );
}
