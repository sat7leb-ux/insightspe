import type { EventRow, EventGoal, DailyReport } from "@/lib/types";

export interface Kpis {
  totalEvents: number;
  activeEvents: number;
  completedEvents: number;
  totalAttendees: number;
  adults: number;
  children: number;
  totalViews: number;
  shares: number;
  comments: number;
  likes: number;
  newContacts: number;
  newPartnerships: number;
  materialsDistributed: number;
  avgAttendance: number;
  goalCompletion: number;
  totalBudget: number | null;
  totalCost: number | null;
  costPerAttendee: number | null;
  costPerView: number | null;
}

export function computeKpis(
  events: EventRow[],
  contactsCount: number,
  partnershipsCount: number,
  materialsCount: number,
  goals: { target: number; current_value: number }[],
): Kpis {
  const nonCancelled = events.filter((e) => e.status !== "Cancelled");
  const totalAttendees = nonCancelled.reduce((s, e) => s + e.adults + e.children, 0);
  const adults = nonCancelled.reduce((s, e) => s + e.adults, 0);
  const children = nonCancelled.reduce((s, e) => s + e.children, 0);
  const totalViews = nonCancelled.reduce((s, e) => s + e.views, 0);
  const withGoals = goals.filter((g) => g.target > 0);
  const goalCompletion = withGoals.length
    ? withGoals.reduce((s, g) => s + Math.min(1, g.current_value / g.target), 0) / withGoals.length
    : 0;
  const budgets = nonCancelled.filter((e) => e.budget != null);
  const costs = nonCancelled.filter((e) => e.actual_cost != null);
  const totalBudget = budgets.length ? budgets.reduce((s, e) => s + (e.budget ?? 0), 0) : null;
  const totalCost = costs.length ? costs.reduce((s, e) => s + (e.actual_cost ?? 0), 0) : null;

  return {
    totalEvents: events.length,
    activeEvents: events.filter((e) => ["Planning", "Confirmed", "In Progress"].includes(e.status)).length,
    completedEvents: events.filter((e) => e.status === "Completed").length,
    totalAttendees, adults, children,
    totalViews,
    shares: nonCancelled.reduce((s, e) => s + e.shares, 0),
    comments: nonCancelled.reduce((s, e) => s + e.comments_count, 0),
    likes: nonCancelled.reduce((s, e) => s + e.likes, 0),
    newContacts: contactsCount,
    newPartnerships: partnershipsCount,
    materialsDistributed: materialsCount,
    avgAttendance: nonCancelled.length ? Math.round(totalAttendees / nonCancelled.length) : 0,
    goalCompletion,
    totalBudget,
    totalCost,
    costPerAttendee: totalCost && totalAttendees ? totalCost / totalAttendees : null,
    costPerView: totalCost && totalViews ? totalCost / totalViews : null,
  };
}

export function eventsOverTime(events: EventRow[], months = 8): { labels: string[]; counts: number[]; attendees: number[] } {
  const now = new Date();
  const labels: string[] = [];
  const counts: number[] = [];
  const attendees: number[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    labels.push(d.toLocaleString("en", { month: "short" }) + (d.getMonth() === 0 ? ` ${String(d.getFullYear()).slice(2)}` : ""));
    const monthEvents = events.filter((e) => e.start_date.startsWith(key) && e.status !== "Cancelled");
    counts.push(monthEvents.length);
    attendees.push(monthEvents.reduce((s, e) => s + e.adults + e.children, 0));
  }
  return { labels, counts, attendees };
}

export function groupCount<T>(items: T[], key: (t: T) => string): { labels: string[]; data: number[] } {
  const map = new Map<string, number>();
  for (const item of items) {
    const k = key(item) || "—";
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
  return { labels: sorted.map((x) => x[0]), data: sorted.map((x) => x[1]) };
}

export function channelBreakdown(events: EventRow[], channels: { id: string; name: string }[]): { labels: string[]; data: number[] } {
  const map = new Map<string, number>();
  for (const ch of channels) map.set(ch.name, 0);
  for (const e of events) {
    if (e.status === "Cancelled") continue;
    for (const cid of e.channel_ids) {
      const name = channels.find((c) => c.id === cid)?.name ?? "Other";
      map.set(name, (map.get(name) ?? 0) + 1);
    }
  }
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
  return { labels: sorted.map((x) => x[0]), data: sorted.map((x) => x[1]) };
}

export function attendanceByDay(reports: DailyReport[]): { labels: string[]; adults: number[]; children: number[] } {
  const sorted = [...reports].sort((a, b) => a.report_date.localeCompare(b.report_date));
  return {
    labels: sorted.map((r) => r.report_date.slice(5)),
    adults: sorted.map((r) => r.adults),
    children: sorted.map((r) => r.children),
  };
}

export function goalProgress(goals: EventGoal[]): { label: string; pct: number; status: string }[] {
  return goals.map((g) => ({
    label: g.goal,
    pct: g.target > 0 ? Math.min(100, Math.round((g.current_value / g.target) * 100)) : 0,
    status: g.status,
  }));
}
