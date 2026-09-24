"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { EventRow, Partner, Channel, Profile, EventTypeRow, Country } from "@/lib/types";
import { EVENT_STATUSES, EVENT_STAGES, EVENT_TYPES } from "@/lib/types";
import { useToast } from "@/components/ui/toast";
import { Loader2 } from "lucide-react";
import { COUNTRY_LIST, areasForCountry } from "@/lib/country-areas";

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

  // country dropdown: static list first, then DB areas, then countries table, then partner countries
  const countryOptions = useMemo(() => {
    const set = new Set<string>(COUNTRY_LIST);
    for (const a of areas) set.add(a.country);
    for (const c of countriesList ?? []) set.add(c.name);
    for (const c of countries) if (c) set.add(c);
    set.delete("");
    return [...set].sort();
  }, [areas, countries]);

  const areaOptions = useMemo(
    () => areasForCountry(form.country, areas),
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
        const { staff_ids, volunteer_names, ...rest } = form;
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
        toast("Event created successfully");
        router.push(`/events/${data.id}`);
      }
      onDone();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err && "message" in err
            ? String((err as { message: string }).message)
            : "Could not save event";
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

