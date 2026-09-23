import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

// ---------- status badge ----------
const STATUS_STYLES: Record<string, { bg: string; fg: string; dot: string }> = {
  Planning: { bg: "var(--sky-soft)", fg: "#0369a1", dot: "#0ea5e9" },
  Confirmed: { bg: "var(--brand-soft)", fg: "#1e40af", dot: "#3b82f6" },
  "In Progress": { bg: "var(--amber-soft)", fg: "#b45309", dot: "#f59e0b" },
  Completed: { bg: "var(--green-soft)", fg: "#047857", dot: "#10b981" },
  Cancelled: { bg: "var(--red-soft)", fg: "#b91c1c", dot: "#ef4444" },
  Archived: { bg: "var(--surface-2)", fg: "#475569", dot: "#94a3b8" },
  // goals
  "Not Started": { bg: "var(--surface-2)", fg: "#475569", dot: "#94a3b8" },
  "On Track": { bg: "var(--green-soft)", fg: "#047857", dot: "#10b981" },
  "At Risk": { bg: "var(--red-soft)", fg: "#b91c1c", dot: "#ef4444" },
  // partnerships
  Prospect: { bg: "var(--surface-2)", fg: "#475569", dot: "#94a3b8" },
  Contacted: { bg: "var(--sky-soft)", fg: "#0369a1", dot: "#0ea5e9" },
  Meeting: { bg: "var(--brand-soft)", fg: "#1e40af", dot: "#3b82f6" },
  Negotiation: { bg: "var(--violet-soft)", fg: "#6d28d9", dot: "#8b5cf6" },
  Active: { bg: "var(--green-soft)", fg: "#047857", dot: "#10b981" },
  "Follow-up": { bg: "var(--amber-soft)", fg: "#b45309", dot: "#f59e0b" },
  Closed: { bg: "var(--surface-2)", fg: "#475569", dot: "#64748b" },
  Lost: { bg: "var(--red-soft)", fg: "#b91c1c", dot: "#ef4444" },
  New: { bg: "var(--sky-soft)", fg: "#0369a1", dot: "#0ea5e9" },
  "Meeting Scheduled": { bg: "var(--violet-soft)", fg: "#6d28d9", dot: "#8b5cf6" },
  Yes: { bg: "var(--green-soft)", fg: "#047857", dot: "#10b981" },
  No: { bg: "var(--red-soft)", fg: "#b91c1c", dot: "#ef4444" },
  Maybe: { bg: "var(--amber-soft)", fg: "#b45309", dot: "#f59e0b" },
};

export function StatusBadge({ status, className }: { status?: string | null; className?: string }) {
  const s = STATUS_STYLES[status ?? ""] ?? { bg: "var(--surface-2)", fg: "#475569", dot: "#94a3b8" };
  return (
    <span className={cn("badge", className)} style={{ background: s.bg, color: s.fg }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} aria-hidden />
      {status ?? "—"}
    </span>
  );
}

// ---------- generic tag ----------
export function Tag({ children, color, className }: { children: React.ReactNode; color?: string; className?: string }) {
  return (
    <span
      className={cn("badge", className)}
      style={color ? { background: `${color}18`, color, borderColor: `${color}40` } : { background: "var(--surface-2)", color: "var(--muted)" }}
    >
      {children}
    </span>
  );
}

// ---------- stat card ----------
export function StatCard({
  label, value, icon: Icon, hint, tone = "default", loading,
}: {
  label: string; value: string | number; icon: LucideIcon; hint?: string;
  tone?: "default" | "brand" | "gold" | "green" | "red" | "violet" | "sky";
  loading?: boolean;
}) {
  const tones: Record<string, { bg: string; fg: string }> = {
    default: { bg: "var(--surface-2)", fg: "#334155" },
    brand: { bg: "var(--brand-soft)", fg: "#1d4ed8" },
    gold: { bg: "var(--gold-soft)", fg: "#b45309" },
    green: { bg: "var(--green-soft)", fg: "#047857" },
    red: { bg: "var(--red-soft)", fg: "#b91c1c" },
    violet: { bg: "var(--violet-soft)", fg: "#6d28d9" },
    sky: { bg: "var(--sky-soft)", fg: "#0369a1" },
  };
  const t = tones[tone];
  return (
    <div className="card card-hover p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl grid place-items-center shrink-0" style={{ background: t.bg, color: t.fg }} aria-hidden>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate">{label}</p>
        {loading ? (
          <div className="skeleton h-7 w-20 mt-1" />
        ) : (
          <p className="text-[22px] font-bold leading-tight mt-0.5 tabular-nums">{value}</p>
        )}
        {hint && <p className="text-[11.5px] text-slate-500 mt-0.5 truncate">{hint}</p>}
      </div>
    </div>
  );
}

// ---------- empty state ----------
export function EmptyState({
  icon: Icon, title, description, action,
}: {
  icon: LucideIcon; title: string; description?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl grid place-items-center mb-3" style={{ background: "var(--surface-2)", color: "var(--muted)" }}>
        <Icon size={22} />
      </div>
      <h3 className="font-semibold text-[15px]">{title}</h3>
      {description && <p className="text-[13px] text-slate-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ---------- skeleton blocks ----------
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardsSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4">
          <Skeleton className="h-3 w-24 mb-2" />
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

// ---------- page header ----------
export function PageHeader({
  title, description, actions,
}: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-[13px] text-slate-500 mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

// ---------- avatar ----------
export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const palette = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0284c7", "#be185d"];
  const idx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length;
  const ini = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  return (
    <span
      className="rounded-full grid place-items-center font-semibold text-white shrink-0"
      style={{ width: size, height: size, background: palette[idx], fontSize: size * 0.38 }}
      aria-hidden
    >
      {ini}
    </span>
  );
}

// ---------- progress bar ----------
export function ProgressBar({ value, max, tone }: { value: number; max: number; tone?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const color = tone ?? (pct >= 100 ? "#10b981" : pct >= 50 ? "#3b82f6" : "#f59e0b");
  return (
    <div>
      <div className="flex justify-between text-[11.5px] text-slate-500 mb-1">
        <span className="tabular-nums">{value.toLocaleString()} / {max.toLocaleString()}</span>
        <span className="tabular-nums font-semibold" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
