"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { EventRow, Partner, Channel, Profile, EventTypeRow } from "@/lib/types";
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
  staff_count: number;
  volunteer_count: number;
  manager_id: string;
  campaign_tag: string;
  views: number;
  unique_views: number;
  shares: number;
  comments_count: number;
  likes: number;
  budget: string;
  actual_cost: string;
  currency: string;
  cost_notes: string;
}

export function EventForm({
  event, partners, channels, profiles, eventTypes, onDone, onCancel,
}: {
  event: EventRow | null;
  partners: Partner[];
  channels: Channel[];
  profiles: Profile[];
  eventTypes: EventTypeRow[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    staff_count: event?.staff_count ?? 0,
    volunteer_count: event?.volunteer_count ?? 0,
    manager_id: event?.manager_id ?? "",
    campaign_tag: event?.campaign_tag ?? "",
    views: event?.views ?? 0,
    unique_views: event?.unique_views ?? 0,
    shares: event?.shares ?? 0,
    comments_count: event?.comments_count ?? 0,
    likes: event?.likes ?? 0,
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) { setError("Event name is required."); return; }
    if (form.end_date < form.start_date) { setError("End date cannot be before start date."); return; }

    setSaving(true);
    try {
      const sb = createClient();
      const payload = {
        ...form,
        partner_id: form.partner_id || null,
        manager_id: form.manager_id || null,
        budget: form.budget === "" ? null : Number(form.budget),
        actual_cost: form.actual_cost === "" ? null : Number(form.actual_cost),
      };
      if (event) {
        const { error } = await sb.from("events").update(payload).eq("id", event.id);
        if (error) throw error;
        toast("Event updated successfully");
      } else {
        const { data, error } = await sb.from("events").insert(payload).select("id").single();
        if (error) throw error;
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
          <label className="label" htmlFor="ev-city">City / Area</label>
          <input id="ev-city" className="input" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Beirut" />
        </div>
        <div>
          <label className="label" htmlFor="ev-country">Country</label>
          <input id="ev-country" className="input" list="country-list" value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="Lebanon" />
          <datalist id="country-list">
            {countries.map((c) => <option key={c} value={c} />)}
          </datalist>
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
        <div>
          <label className="label" htmlFor="ev-status">Status</label>
          <select id="ev-status" className="select" value={form.status} onChange={(e) => set("status", e.target.value)}>
            {EVENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ev-stage">Pipeline Stage</label>
          <select id="ev-stage" className="select" value={form.stage} onChange={(e) => set("stage", e.target.value)}>
            {EVENT_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
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

      <Section title="Attendance & Team">
        <div>
          <label className="label" htmlFor="ev-adults">Adults</label>
          <input id="ev-adults" type="number" min={0} className="input" value={form.adults} onChange={(e) => set("adults", Number(e.target.value))} />
        </div>
        <div>
          <label className="label" htmlFor="ev-children">Children</label>
          <input id="ev-children" type="number" min={0} className="input" value={form.children} onChange={(e) => set("children", Number(e.target.value))} />
        </div>
        <div>
          <label className="label" htmlFor="ev-staff">Staff</label>
          <input id="ev-staff" type="number" min={0} className="input" value={form.staff_count} onChange={(e) => set("staff_count", Number(e.target.value))} />
        </div>
        <div>
          <label className="label" htmlFor="ev-volunteers">Volunteers</label>
          <input id="ev-volunteers" type="number" min={0} className="input" value={form.volunteer_count} onChange={(e) => set("volunteer_count", Number(e.target.value))} />
        </div>
        <div className="sm:col-span-2">
          <p className="text-[12px] text-slate-500">
            Total attendees: <strong>{form.adults + form.children}</strong> · Field team: <strong>{form.staff_count + form.volunteer_count}</strong>
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
      </Section>

      <Section title="Reach & Engagement (totals)">
        <div>
          <label className="label" htmlFor="ev-views">Story / Post Views</label>
          <input id="ev-views" type="number" min={0} className="input" value={form.views} onChange={(e) => set("views", Number(e.target.value))} />
        </div>
        <div>
          <label className="label" htmlFor="ev-unique">Unique Views</label>
          <input id="ev-unique" type="number" min={0} className="input" value={form.unique_views} onChange={(e) => set("unique_views", Number(e.target.value))} />
        </div>
        <div>
          <label className="label" htmlFor="ev-shares">Shares</label>
          <input id="ev-shares" type="number" min={0} className="input" value={form.shares} onChange={(e) => set("shares", Number(e.target.value))} />
        </div>
        <div>
          <label className="label" htmlFor="ev-comments">Comments</label>
          <input id="ev-comments" type="number" min={0} className="input" value={form.comments_count} onChange={(e) => set("comments_count", Number(e.target.value))} />
        </div>
        <div>
          <label className="label" htmlFor="ev-likes">Likes</label>
          <input id="ev-likes" type="number" min={0} className="input" value={form.likes} onChange={(e) => set("likes", Number(e.target.value))} />
        </div>
        <div className="sm:col-span-2">
          <p className="label">Platforms Reached</p>
          <PlatformPicker form={form} set={set} />
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

function PlatformPicker({ form, set }: { form: FormState; set: <K extends keyof FormState>(k: K, v: FormState[K]) => void }) {
  const [platforms, setPlatforms] = useState<{ id: string; name: string; color: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("platforms").select("id, name, color").eq("is_active", true).order("sort_order")
      .then(({ data }) => { if (!cancelled) setPlatforms(data ?? []); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex flex-wrap gap-2">
      {platforms.map((p) => (
        <button
          type="button"
          key={p.id}
          onClick={() => set("platform_ids", form.platform_ids.includes(p.id) ? form.platform_ids.filter((x) => x !== p.id) : [...form.platform_ids, p.id])}
          aria-pressed={form.platform_ids.includes(p.id)}
          className="badge"
          style={{
            background: form.platform_ids.includes(p.id) ? p.color : "var(--surface-2)",
            color: form.platform_ids.includes(p.id) ? "#fff" : "var(--muted)",
            padding: "6px 14px",
            fontSize: "12.5px",
          }}
        >
          {p.name}
        </button>
      ))}
    </div>
  );
}
