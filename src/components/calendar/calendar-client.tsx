"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { EventRow } from "@/lib/types";
import { StatusBadge, PageHeader, EmptyState } from "@/components/ui/primitives";
import { formatDate, cn } from "@/lib/utils";
import { CalendarRange, ChevronLeft, ChevronRight, List } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  Planning: "#0ea5e9",
  Confirmed: "#3b82f6",
  "In Progress": "#f59e0b",
  Completed: "#10b981",
  Cancelled: "#ef4444",
  Archived: "#94a3b8",
};

type View = "month" | "week" | "list";

export function CalendarClient({ events }: { events: EventRow[] }) {
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [weekStart, setWeekStart] = useState(() => {
    const n = new Date();
    const d = new Date(n.getFullYear(), n.getMonth(), n.getDate() - ((n.getDay() + 6) % 7));
    return d;
  });

  const byDate = useMemo(() => {
    const map = new Map<string, EventRow[]>();
    for (const e of events) {
      if (e.status === "Archived" || e.status === "Cancelled") continue;
      const d = new Date(e.start_date);
      const end = new Date(e.end_date);
      while (d <= end) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(e);
        d.setDate(d.getDate() + 1);
      }
    }
    return map;
  }, [events]);

  const monthDays = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const startOffset = (first.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.year, cursor.month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const upcoming = useMemo(
    () => events.filter((e) => e.end_date >= todayKey && e.status !== "Archived").sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [events, todayKey],
  );

  const moveMonth = (dir: 1 | -1) => {
    setCursor((c) => {
      const m = c.month + dir;
      if (m < 0) return { year: c.year - 1, month: 11 };
      if (m > 11) return { year: c.year + 1, month: 0 };
      return { ...c, month: m };
    });
  };

  const moveWeek = (dir: 1 | -1) => {
    setWeekStart((d) => {
      const n = new Date(d);
      n.setDate(n.getDate() + dir * 7);
      return n;
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Calendar"
        description="Events by month, week or list."
        actions={
          <div className="flex rounded-[10px] border overflow-hidden">
            {(["month", "week", "list"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-3.5 py-1.5 text-[12.5px] font-semibold capitalize transition-colors"
                style={{ background: view === v ? "var(--brand)" : "var(--surface)", color: view === v ? "#fff" : "var(--muted)" }}
              >
                {v}
              </button>
            ))}
          </div>
        }
      />

      {view !== "list" && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button className="btn btn-secondary btn-sm" onClick={() => (view === "month" ? moveMonth(-1) : moveWeek(-1))} aria-label="Previous"><ChevronLeft size={15} /></button>
            <button className="btn btn-secondary btn-sm" onClick={() => (view === "month" ? moveMonth(1) : moveWeek(1))} aria-label="Next"><ChevronRight size={15} /></button>
          </div>
          <p className="font-semibold text-[15px]">
            {view === "month"
              ? new Date(cursor.year, cursor.month).toLocaleString("en", { month: "long", year: "numeric" })
              : `Week of ${formatDate(weekDays[0]!.toISOString())}`}
          </p>
          <p className="text-[12px] text-slate-400 flex gap-3">
            {Object.entries(STATUS_COLORS).slice(0, 5).map(([s, c]) => (
              <span key={s} className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: c }} />{s}</span>
            ))}
          </p>
        </div>
      )}

      {view === "month" && (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-7 border-b">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400" style={{ background: "var(--surface-2)" }}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthDays.map((d, i) => {
              if (!d) return <div key={i} className="min-h-[86px] border-b border-r" style={{ background: "var(--surface-2)", opacity: 0.35 }} />;
              const key = dateKey(d);
              const dayEvents = byDate.get(key) ?? [];
              const isToday = key === todayKey;
              return (
                <div key={i} className="min-h-[86px] border-b border-r p-1.5">
                  <p className={cn("text-[12px] font-semibold tabular-nums mb-1", isToday ? "text-white rounded-full w-6 h-6 grid place-items-center" : "text-slate-500")}
                    style={isToday ? { background: "var(--brand)" } : undefined}>
                    {d.getDate()}
                  </p>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((e) => (
                      <Link key={e.id} href={`/events/${e.id}`} className="block text-[10.5px] font-medium rounded px-1.5 py-0.5 truncate hover:opacity-80"
                        style={{ background: `${STATUS_COLORS[e.status]}18`, color: STATUS_COLORS[e.status] }} title={e.name}>
                        {e.name}
                      </Link>
                    ))}
                    {dayEvents.length > 3 && <p className="text-[10px] text-slate-400 px-1">+{dayEvents.length - 3} more</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "week" && (
        <div className="grid gap-3 md:grid-cols-7">
          {weekDays.map((d) => {
            const key = dateKey(d);
            const dayEvents = byDate.get(key) ?? [];
            return (
              <div key={key} className="card p-3 min-h-[140px]">
                <p className="text-[12px] font-bold mb-2" style={{ color: key === todayKey ? "var(--brand-ink)" : "var(--muted)" }}>
                  {d.toLocaleString("en", { weekday: "short" })} {d.getDate()}
                </p>
                <div className="space-y-1.5">
                  {dayEvents.map((e) => (
                    <Link key={e.id} href={`/events/${e.id}`} className="block rounded-lg px-2 py-1.5 text-[11.5px] font-medium"
                      style={{ background: `${STATUS_COLORS[e.status]}15`, color: STATUS_COLORS[e.status] }}>
                      {e.name}
                    </Link>
                  ))}
                  {dayEvents.length === 0 && <p className="text-[11px] text-slate-300">—</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "list" && (
        <div className="card overflow-hidden">
          {upcoming.length === 0 ? (
            <EmptyState icon={CalendarRange} title="No events scheduled" description="Upcoming events will appear here." />
          ) : (
            <div className="divide-y">
              {upcoming.map((e) => (
                <Link key={e.id} href={`/events/${e.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50">
                  <div className="w-12 text-center shrink-0">
                    <p className="text-[10px] font-bold uppercase text-slate-400">{new Date(e.start_date).toLocaleString("en", { month: "short" })}</p>
                    <p className="text-[18px] font-bold leading-none">{new Date(e.start_date).getDate()}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[13.5px] truncate">{e.name}</p>
                    <p className="text-[12px] text-slate-500 truncate">{[e.city, e.country].filter(Boolean).join(", ")} · {e.event_type}</p>
                  </div>
                  <StatusBadge status={e.status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
