"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { EventGoal } from "@/lib/types";
import { GOAL_STATUSES } from "@/lib/types";
import { PageHeader, StatusBadge, ProgressBar, EmptyState, StatCard } from "@/components/ui/primitives";
import { formatNumber, formatDate } from "@/lib/utils";
import { Target, Trophy, AlertTriangle, CheckCircle2 } from "lucide-react";

export function GoalsClient({ goals }: { goals: (EventGoal & { events?: { id: string; name: string } | null })[] }) {
  const [status, setStatus] = useState("");

  const filtered = useMemo(() => status ? goals.filter((g) => g.status === status) : goals, [goals, status]);

  const completed = goals.filter((g) => g.status === "Completed").length;
  const atRisk = goals.filter((g) => g.status === "At Risk").length;
  const avgPct = goals.length
    ? Math.round(goals.reduce((s, g) => s + (g.target > 0 ? Math.min(100, (g.current_value / g.target) * 100) : 0), 0) / goals.length)
    : 0;

  return (
    <div className="space-y-5">
      <PageHeader title="Goals / Pipeline" description="All event goals across the portal." />

      <div className="grid gap-4 stagger" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 200px), 1fr))" }}>
        <StatCard label="Total Goals" value={goals.length} icon={Target} tone="brand" />
        <StatCard label="Completed" value={completed} icon={CheckCircle2} tone="green" />
        <StatCard label="At Risk" value={atRisk} icon={AlertTriangle} tone="red" />
        <StatCard label="Avg Progress" value={`${avgPct}%`} icon={Trophy} tone="gold" />
      </div>

      <div className="flex gap-2 flex-wrap">
        <button className="btn btn-sm" style={{ background: !status ? "var(--brand)" : "var(--surface)", color: !status ? "#fff" : "var(--muted)", border: "1px solid var(--border)" }} onClick={() => setStatus("")}>All</button>
        {GOAL_STATUSES.map((s) => (
          <button key={s} className="btn btn-sm" style={{ background: status === s ? "var(--brand)" : "var(--surface)", color: status === s ? "#fff" : "var(--muted)", border: "1px solid var(--border)" }} onClick={() => setStatus(s)}>
            {s} ({goals.filter((g) => g.status === s).length})
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card"><EmptyState icon={Target} title="No goals found" description="Goals are configured on each event page." /></div>
        ) : filtered.map((g) => (
          <div key={g.id} className="card card-hover p-4">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
              <div className="min-w-0">
                <p className="font-semibold text-[14px]">{g.goal}</p>
                <p className="text-[12px] text-slate-500 mt-0.5">
                  {g.events?.name && <Link href={`/events/${g.events.id}`} className="text-blue-700 hover:underline font-medium">{g.events.name}</Link>}
                  {g.deadline && ` · due ${formatDate(g.deadline)}`}
                  {g.unit && ` · in ${g.unit}`}
                </p>
              </div>
              <StatusBadge status={g.status} />
            </div>
            <ProgressBar value={Number(g.current_value)} max={Number(g.target)} />
            {g.notes && <p className="text-[12px] text-slate-500 mt-2">{g.notes}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
