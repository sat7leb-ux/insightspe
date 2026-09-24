"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { EventRow, Partner, Channel, Profile, EventTypeRow, Country } from "@/lib/types";
import { EVENT_STATUSES, EVENT_STAGES, EVENT_TYPES } from "@/lib/types";
import { useToast } from "@/components/ui/toast";
import { Loader2 } from "lucide-react";

// Module-scope so React keeps the same component identity across re-renders.
// (Defining this inside EventForm remounts all inputs on every keystroke,
// which made text fields lose focus after one character.)
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 border-b pb-1.5">{title}</p>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function avatarColor(name: string): string {
  const palette = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0284c7", "#be185d"];
  const idx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length;
  return palette[idx];
}

interface FormState {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  city: string;
  country: string;
  partner_id: string;
  event_type: string;
  status: string;
  stage: string;
  channel_ids: string[];
  platform_ids: string[];
  adults: number;
  children: number;
  staff_ids: string[];
  volunteer_names: string;
  manager_id: string;
  campaign_tag: string;
  kpi_views: number;
  kpi_likes: number;
  kpi_comments: number;
  kpi_shares: number;
  kpi_followers: number;
  kpi_attendees: number;
  budget: string;
  actual_cost: string;
  currency: string;
  cost_notes: string;
}

export function EventForm({
  event, partners, channels, profiles, eventTypes, areas, countriesList, initialStaffIds, onDone, onCancel,
}: {
  event: EventRow | null;
  partners: Partner[];
  channels: Channel[];
  profiles: Profile[];
  eventTypes: EventTypeRow[];
  areas: { country: string; area: string }[];
  countriesList?: Country[];
  initialStaffIds?: string[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staffQuery, setStaffQuery] = useState("");
  const [staffOpen, setStaffOpen] = useState(false);

  const [form, setForm] = useState<FormState>({
    name: event?.name ?? "",
    description: event?.description ?? "",
    start_date: event?.start_date ?? new Date().toISOString().slice(0, 10),
    end_date: event?.end_date ?? new Date().toISOString().slice(0, 10),
    city: event?.city ?? "",
    country: event?.country ?? "",
    partner_id: event?.partner_id ?? "",
    event_type: event?.event_type ?? "School Outreach",
    status: event?.status ?? "Planning",
    stage: event?.stage ?? "Planning",
    channel_ids: event?.channel_ids ?? [],
    platform_ids: event?.platform_ids ?? [],
    adults: event?.adults ?? 0,
    children: event?.children ?? 0,
    staff_ids: initialStaffIds ?? [],
    volunteer_names: event?.volunteer_names ?? "",
    manager_id: event?.manager_id ?? "",
    campaign_tag: event?.campaign_tag ?? "",
    kpi_views: 0,
    kpi_likes: 0,
    kpi_comments: 0,
    kpi_shares: 0,
    kpi_followers: 0,
    kpi_attendees: 0,
    budget: event?.budget != null ? String(event.budget) : "",
    actual_cost: event?.actual_cost != null ? String(event.actual_cost) : "",
    currency: event?.currency ?? "USD",
    cost_notes: event?.cost_notes ?? "",
  });

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const toggleInArray = (key: "channel_ids" | "platform_ids", id: string) => {
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(id) ? f[key].filter((x) => x !== id) : [...f[key], id],
    }));
  };

  const countries = [...new Set(partners.map((p) => p.country).filter(Boolean))].sort();

  // country dropdown: areas table first, then countries table, then partner countries
  const countryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const a of areas) set.add(a.country);
    for (const c of countriesList ?? []) set.add(c.name);
    for (const c of countries) if (c) set.add(c);
    set.delete("");
    return [...set].sort();
  }, [areas, countries]);

  const areaOptions = useMemo(
    () => areas.filter((a) => a.country === form.country).map((a) => a.area).sort(),
    [areas, form.country],
  );

  const volunteerList = useMemo(
    () => form.volunteer_names.split("\n").map((s) => s.trim()).filter(Boolean),
    [form.volunteer_names],
  );

  const filteredStaff = useMemo(() => {
    const t = staffQuery.trim().toLowerCase();
    const pool = profiles.filter((p) => p.is_active !== false);
    if (!t) return pool;
    return pool.filter((p) =>
      p.full_name.toLowerCase().includes(t) || p.email.toLowerCase().includes(t) || p.dept.toLowerCase().includes(t));
  }, [profiles, staffQuery]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) { setError("Event name is required."); return; }
    if (form.end_date < form.start_date) { setError("End date cannot be before start date."); return; }

    setSaving(true);
    try {
      const sb = createClient();
      const volunteerNames = form.volunteer_names
        .split("\n").map((s) => s.trim()).filter(Boolean);
      const staffCount = form.staff_ids.length;
      const volunteerCount = volunteerNames.length;

      const buildPayload = (includeNames: boolean) => {
        const { kpi_views, kpi_likes, kpi_comments, kpi_shares, kpi_followers, kpi_attendees, ...rest } = form;
        return {
          ...rest,
          partner_id: form.partner_id || null,
          manager_id: form.manager_id || null,
          staff_count: staffCount,
          volunteer_count: volunteerCount,
          ...(includeNames ? { volunteer_names: volunteerNames.join("\n") } : {}),
          budget: form.budget === "" ? null : Number(form.budget),
          actual_cost: form.actual_cost === "" ? null : Number(form.actual_cost),
        };
      };

      // KPI targets -> event goal rows
      const kpiGoals = ([
        ["Reach 100,000 views", form.kpi_views, "views"],
        ["Earn 5,000 likes", form.kpi_likes, "likes"],
        ["Generate 500 comments", form.kpi_comments, "comments"],
        ["Get 1,000 shares", form.kpi_shares, "shares"],
        ["Gain 2,000 new followers", form.kpi_followers, "followers"],
        ["Reach target attendance", form.kpi_attendees, "attendees"],
      ] as const).filter(([, target]) => target > 0)
        .map(([goal, target, unit]) => ({
          goal: goal.replace(/[\d,]+/, String(target)),
          target,
          unit,
          status: "Not Started",
        }));

      const syncKpiGoals = async (eventId: string) => {
        if (kpiGoals.length === 0) return;
        // remove previous auto-generated KPI goals, keep manual ones
        await sb.from("event_goals").delete().eq("event_id", eventId).in("unit", ["views", "likes", "comments", "shares", "followers", "attendees"]);
        await sb.from("event_goals").insert(kpiGoals.map((g) => ({ ...g, event_id: eventId })));
      };

      const syncStaff = async (eventId: string) => {
        await sb.from("event_participants").delete().eq("event_id", eventId).eq("responsibility", "Staff");
        if (form.staff_ids.length > 0) {
          await sb.from("event_participants")
            .insert(form.staff_ids.map((uid) => ({ event_id: eventId, user_id: uid, responsibility: "Staff", participation_status: "Confirmed" })));
        }
      };

      if (event) {
        let { error } = await sb.from("events").update(buildPayload(true)).eq("id", event.id);
        if (error && /volunteer_names/.test(error.message)) {
          // column not migrated yet — save without names
          ({ error } = await sb.from("events").update(buildPayload(false)).eq("id", event.id));
        }
        if (error) throw error;
        await syncStaff(event.id);
        await syncKpiGoals(event.id);
        toast("Event updated successfully");
      } else {
        let res = await sb.from("events").insert(buildPayload(true)).select("id").single();
        if (res.error && /volunteer_names/.test(res.error.message)) {
          // column not migrated yet — save without names
          res = await sb.from("events").insert(buildPayload(false)).select("id").single();
        }
        if (res.error) throw res.error;
        const data = res.data!;
        await syncStaff(data.id);
        await syncKpiGoals(data.id);
        toast("Event created successfully");
        router.push(`/events/${data.id}`);
      }
      onDone();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save event";
      setError(msg.includes("row-level security") ? "Permission denied — your role cannot write events." : msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <Section title="Basic Information">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="ev-name">Event Name *</label>
          <input id="ev-name" className="input" required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Days of the Diocese" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="ev-desc">Description</label>
          <textarea id="ev-desc" className="textarea" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="ev-start">Start Date *</label>
          <input id="ev-start" type="date" className="input" required value={form.start_date} onChange={(e) => { set("start_date", e.target.value); if (form.end_date < e.target.value) set("end_date", e.target.value); }} />
        </div>
        <div>
          <label className="label" htmlFor="ev-end">End Date *</label>
          <input id="ev-end" type="date" className="input" required value={form.end_date} min={form.start_date} onChange={(e) => set("end_date", e.target.value)} />
          {form.end_date > form.start_date && (
            <p className="text-[11.5px] text-blue-700 mt-1">
              Multi-day event — daily reports will be available for each day.
            </p>
          )}
        </div>
        <div>
          <label className="label" htmlFor="ev-country">Country *</label>
          <select
            id="ev-country" className="select" required
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value, city: "" })}
          >
            <option value="">— Select country —</option>
            {countryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ev-city">City / Area *</label>
          <select
            id="ev-city" className="select" required
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
            disabled={!form.country}
          >
            <option value="">{form.country ? "— Select area —" : "— Select a country first —"}</option>
            {areaOptions.map((a) => <option key={a} value={a}>{a}</option>)}
            {/* keep legacy custom values selectable when editing old events */}
            {form.city && !areaOptions.includes(form.city) && (
              <option value={form.city}>{form.city} (custom)</option>
            )}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ev-partner">Partner / Host</label>
          <select id="ev-partner" className="select" value={form.partner_id} onChange={(e) => set("partner_id", e.target.value)}>
            <option value="">— None —</option>
            {partners.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.partner_type})</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ev-type">Event Type</label>
          <select id="ev-type" className="select" value={form.event_type} onChange={(e) => set("event_type", e.target.value)}>
            {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="ev-status">Status</label>
          <select id="ev-status" className="select" value={form.status} onChange={(e) => set("status", e.target.value)}>
            {EVENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </Section>

      <Section title="Channels Supported">
        <div className="sm:col-span-2 flex flex-wrap gap-2">
          {channels.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => toggleInArray("channel_ids", c.id)}
              aria-pressed={form.channel_ids.includes(c.id)}
              className="badge transition-transform"
              style={{
                background: form.channel_ids.includes(c.id) ? c.color : "var(--surface-2)",
                color: form.channel_ids.includes(c.id) ? "#fff" : "var(--muted)",
                padding: "6px 14px",
                fontSize: "12.5px",
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Expected Attendance">
        <div>
          <label className="label" htmlFor="ev-adults">Expected Adults</label>
          <input id="ev-adults" type="number" min={0} className="input" value={form.adults} onChange={(e) => set("adults", Number(e.target.value))} placeholder="0" />
        </div>
        <div>
          <label className="label" htmlFor="ev-children">Expected Children</label>
          <input id="ev-children" type="number" min={0} className="input" value={form.children} onChange={(e) => set("children", Number(e.target.value))} placeholder="0" />
        </div>
        <div className="sm:col-span-2 rounded-xl p-3" style={{ background: "var(--surface-2)" }}>
          <p className="text-[13px] text-slate-600">
            Total expected attendance: <strong className="tabular-nums">{(form.adults || 0) + (form.children || 0)}</strong>
            <span className="text-slate-400"> · {form.adults || 0} adults + {form.children || 0} children</span>
          </p>
        </div>
      </Section>

      <Section title="Team">
        {/* Staff picker (from Users) */}
        <div className="sm:col-span-2">
          <label className="label">Staff (from portal users)</label>
          <div className="relative" data-staff-picker>
            <input
              className="input"
              placeholder={form.staff_ids.length ? `${form.staff_ids.length} staff selected — click to add more` : "Search and select staff…"}
              value={staffOpen ? staffQuery : ""}
              onFocus={() => setStaffOpen(true)}
              onChange={(e) => { setStaffOpen(true); setStaffQuery(e.target.value); }}
              onBlur={() => setTimeout(() => setStaffOpen(false), 150)}
              role="combobox"
              aria-expanded={staffOpen}
              aria-label="Search staff"
            />
            {staffOpen && (
              <div className="absolute z-20 left-0 right-0 mt-1 card overflow-hidden max-h-56 overflow-y-auto thin-scroll" style={{ boxShadow: "var(--shadow-pop)" }}>
                {filteredStaff.length === 0 && (
                  <p className="px-3 py-2.5 text-[13px] text-slate-400">No matching users.</p>
                )}
                {filteredStaff.map((p) => {
                  const selected = form.staff_ids.includes(p.id);
                  return (
                    <button
                      key={p.id} type="button"
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setForm((f) => ({
                          ...f,
                          staff_ids: selected ? f.staff_ids.filter((x) => x !== p.id) : [...f.staff_ids, p.id],
                        }));
                        setStaffQuery("");
                      }}
                    >
                      <span className="w-7 h-7 rounded-full grid place-items-center text-[11px] font-semibold text-white shrink-0"
                        style={{ background: avatarColor(p.full_name) }}>
                        {p.full_name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-medium truncate">{p.full_name}</span>
                        <span className="block text-[11px] text-slate-500 truncate">{p.email} · {p.dept || p.role.replace("_", " ")}</span>
                      </span>
                      {selected && <span className="text-emerald-600 text-[12px] font-semibold">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {form.staff_ids.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.staff_ids.map((id) => {
                const p = profiles.find((x) => x.id === id);
                if (!p) return null;
                return (
                  <span key={id} className="badge" style={{ background: "var(--brand-soft)", color: "#1e40af", padding: "5px 10px" }}>
                    {p.full_name}
                    <button
                      type="button" className="ml-1 opacity-60 hover:opacity-100" aria-label={`Remove ${p.full_name}`}
                      onClick={() => setForm((f) => ({ ...f, staff_ids: f.staff_ids.filter((x) => x !== id) }))}
                    >×</button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Volunteers free-text */}
        <div className="sm:col-span-2">
          <label className="label" htmlFor="ev-volunteers">Volunteers (type each name on its own line)</label>
          <textarea
            id="ev-volunteers" className="textarea" rows={4}
            value={form.volunteer_names}
            onChange={(e) => set("volunteer_names", e.target.value)}
            placeholder={"Rania Haddad\nMichel Aoun\nNour Khoury"}
          />
          <p className="text-[11.5px] text-slate-400 mt-1">
            {volunteerList.length} volunteer{volunteerList.length === 1 ? "" : "s"} — one per line
          </p>
        </div>

        <div>
          <label className="label" htmlFor="ev-manager">Event Manager</label>
          <select id="ev-manager" className="select" value={form.manager_id} onChange={(e) => set("manager_id", e.target.value)}>
            <option value="">— Unassigned —</option>
            {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ev-campaign">Campaign Hashtag / Tag</label>
          <input id="ev-campaign" className="input" value={form.campaign_tag} onChange={(e) => set("campaign_tag", e.target.value)} placeholder="#DaysOfTheDiocese2026" />
        </div>
        <div className="sm:col-span-2">
          <p className="text-[12px] text-slate-500">
            Team size: <strong>{form.staff_ids.length + volunteerList.length}</strong> ({form.staff_ids.length} staff · {volunteerList.length} volunteers)
          </p>
        </div>
      </Section>

      <Section title="KPI Targets">
        <p className="sm:col-span-2 text-[12.5px] text-slate-500 -mt-1 mb-1">
          Set the digital targets for this event. Actual performance is tracked automatically from the posts linked in the Social Media tab.
        </p>
        <div>
          <label className="label" htmlFor="kpi-views">Target Views</label>
          <input id="kpi-views" type="number" min={0} className="input" value={form.kpi_views} onChange={(e) => set("kpi_views", Number(e.target.value))} placeholder="e.g. 100000" />
        </div>
        <div>
          <label className="label" htmlFor="kpi-likes">Target Likes</label>
          <input id="kpi-likes" type="number" min={0} className="input" value={form.kpi_likes} onChange={(e) => set("kpi_likes", Number(e.target.value))} placeholder="e.g. 5000" />
        </div>
        <div>
          <label className="label" htmlFor="kpi-comments">Target Comments</label>
          <input id="kpi-comments" type="number" min={0} className="input" value={form.kpi_comments} onChange={(e) => set("kpi_comments", Number(e.target.value))} placeholder="e.g. 500" />
        </div>
        <div>
          <label className="label" htmlFor="kpi-shares">Target Shares</label>
          <input id="kpi-shares" type="number" min={0} className="input" value={form.kpi_shares} onChange={(e) => set("kpi_shares", Number(e.target.value))} placeholder="e.g. 1000" />
        </div>
        <div>
          <label className="label" htmlFor="kpi-followers">Target New Followers</label>
          <input id="kpi-followers" type="number" min={0} className="input" value={form.kpi_followers} onChange={(e) => set("kpi_followers", Number(e.target.value))} placeholder="e.g. 2000" />
        </div>
        <div>
          <label className="label" htmlFor="kpi-attendees">Target Attendance</label>
          <input id="kpi-attendees" type="number" min={0} className="input" value={form.kpi_attendees} onChange={(e) => set("kpi_attendees", Number(e.target.value))} placeholder="e.g. 3000" />
        </div>
      </Section>

      <Section title="Cost / Budget (restricted visibility)">
        <div>
          <label className="label" htmlFor="ev-budget">Budget</label>
          <input id="ev-budget" type="number" min={0} step="0.01" className="input" value={form.budget} onChange={(e) => set("budget", e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <label className="label" htmlFor="ev-cost">Actual Cost</label>
          <input id="ev-cost" type="number" min={0} step="0.01" className="input" value={form.actual_cost} onChange={(e) => set("actual_cost", e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <label className="label" htmlFor="ev-currency">Currency</label>
          <select id="ev-currency" className="select" value={form.currency} onChange={(e) => set("currency", e.target.value)}>
            {["USD", "EUR", "LBP", "EGP", "JOD", "IQD", "MAD", "AED"].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="ev-costnotes">Cost Notes</label>
          <input id="ev-costnotes" className="input" value={form.cost_notes} onChange={(e) => set("cost_notes", e.target.value)} />
        </div>
      </Section>

      {error && (
        <p className="rounded-xl px-4 py-2.5 text-[13px]" style={{ background: "var(--red-soft)", color: "#b91c1c" }} role="alert">{error}</p>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t">
        <button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving && <Loader2 size={15} className="animate-spin" />}
          {saving ? "Saving…" : event ? "Save Changes" : "Create Event"}
        </button>
      </div>
    </form>
  );
}

