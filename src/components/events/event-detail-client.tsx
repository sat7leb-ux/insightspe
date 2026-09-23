"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type {
  EventRow, Partner, Channel, Profile, EventParticipant, EventGoal, DailyReport,
  GalleryImage, EventContact, EventPartnership, EventMaterial, SocialFollow,
  EventComment, EventSurvey, Testimony, Conversation, ActivityLogEntry,
} from "@/lib/types";
import { GOAL_STATUSES, PARTNERSHIP_STATUSES, FOLLOW_UP_STATUSES, PARTICIPATION_STATUSES, canWriteEvents, canViewFinancials, type UserRole } from "@/lib/types";
import { StatusBadge, Tag, EmptyState, ProgressBar, Avatar } from "@/components/ui/primitives";
import type { LucideIcon } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { EventForm } from "@/components/events/event-form";
import { GalleryTab } from "./gallery-tab";
import { formatNumber, formatMoney, formatDate, formatDateTime, eventDays, dateRangeLabel, downloadCsv } from "@/lib/utils";
import {
  MapPin, Building2, Users, Baby, UserCheck, Eye, Share2, MessageSquare, ThumbsUp,
  Banknote, Pencil, Copy, Archive, Download, Plus, Trash2, Target, Package, Handshake,
  Contact, MessageSquareQuote, MessagesSquare, Activity, CalendarDays, Star, Megaphone,
} from "lucide-react";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "goals", label: "Goals" },
  { id: "daily", label: "Daily Reports" },
  { id: "attendance", label: "Attendance" },
  { id: "reach", label: "Reach & Engagement" },
  { id: "contacts", label: "Leads & Contacts" },
  { id: "partnerships", label: "Partnerships" },
  { id: "testimonies", label: "Testimonies" },
  { id: "conversations", label: "Conversations" },
  { id: "materials", label: "Materials" },
  { id: "gallery", label: "Gallery" },
  { id: "survey", label: "Survey" },
  { id: "comments", label: "Comments" },
  { id: "activity", label: "Activity Log" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function EventDetailClient({
  event, partner, channels, platforms, profiles, participants, goals, dailyReports,
  gallery, contacts, partnerships, materials, follows, comments, surveys, testimonies,
  conversations, activity, role, currentUserId, canFinancial,
}: {
  event: EventRow;
  partner: Partner | null;
  channels: Channel[];
  platforms: { id: string; name: string; color: string }[];
  profiles: Profile[];
  participants: EventParticipant[];
  goals: EventGoal[];
  dailyReports: DailyReport[];
  gallery: GalleryImage[];
  contacts: EventContact[];
  partnerships: EventPartnership[];
  materials: EventMaterial[];
  follows: SocialFollow[];
  comments: EventComment[];
  surveys: EventSurvey[];
  testimonies: Testimony[];
  conversations: Conversation[];
  activity: ActivityLogEntry[];
  role: UserRole;
  currentUserId: string;
  canFinancial: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const canWrite = canWriteEvents(role);
  const [tab, setTab] = useState<TabId>("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const manager = profiles.find((p) => p.id === event.manager_id);
  const eventChannels = channels.filter((c) => event.channel_ids.includes(c.id));
  const eventPlatforms = platforms.filter((p) => event.platform_ids.includes(p.id));
  const days = eventDays(event.start_date, event.end_date);
  const totalAttendees = event.adults + event.children;
  const totalTeam = event.staff_count + event.volunteer_count;

  const duplicate = async () => {
    setBusy(true);
    try {
      const sb = createClient();
      const { id, created_at, updated_at, created_by, updated_by, ...rest } = event;
      const { data, error } = await sb.from("events").insert({ ...rest, name: `${event.name} (Copy)`, status: "Planning" }).select("id").single();
      if (error) throw error;
      toast("Event duplicated");
      router.push(`/events/${data.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not duplicate", "error");
    } finally { setBusy(false); }
  };

  const archive = async () => {
    setBusy(true);
    try {
      const sb = createClient();
      const { error } = await sb.from("events").update({ status: "Archived" }).eq("id", event.id);
      if (error) throw error;
      toast("Event archived");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not archive", "error");
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight">{event.name}</h1>
              <StatusBadge status={event.status} />
              <Tag>{event.event_type}</Tag>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-[13px] text-slate-600">
              <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} className="text-slate-400" />{dateRangeLabel(event.start_date, event.end_date)}{days > 1 && ` · ${days} days`}</span>
              {(event.city || event.country) && (
                <span className="inline-flex items-center gap-1.5"><MapPin size={14} className="text-slate-400" />{[event.city, event.country].filter(Boolean).join(", ")}</span>
              )}
              {partner && <span className="inline-flex items-center gap-1.5"><Building2 size={14} className="text-slate-400" />{partner.name}</span>}
              {manager && <span className="inline-flex items-center gap-1.5"><UserCheck size={14} className="text-slate-400" />{manager.full_name}</span>}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {eventChannels.map((c) => <Tag key={c.id} color={c.color}>{c.name}</Tag>)}
              {event.campaign_tag && <Tag color="#ec4899">{event.campaign_tag}</Tag>}
            </div>
          </div>
          <div className="flex items-center gap-1.5 no-print">
            {canWrite && <button className="btn btn-secondary btn-sm" onClick={() => setEditOpen(true)}><Pencil size={14} /> Edit</button>}
            {canWrite && <button className="btn btn-secondary btn-sm" onClick={duplicate} disabled={busy}><Copy size={14} /> Duplicate</button>}
            {(role === "super_admin" || role === "admin") && event.status !== "Archived" && (
              <button className="btn btn-secondary btn-sm" onClick={archive} disabled={busy}><Archive size={14} /> Archive</button>
            )}
          </div>
        </div>
      </div>

      {/* tabs */}
      <div className="card overflow-hidden">
        <div className="border-b overflow-x-auto thin-scroll" role="tablist" aria-label="Event sections">
          <div className="flex px-2 min-w-max">
            {TABS.map((t) => {
              const active = tab === t.id;
              const count =
                t.id === "goals" ? goals.length :
                t.id === "daily" ? dailyReports.length :
                t.id === "contacts" ? contacts.length :
                t.id === "partnerships" ? partnerships.length :
                t.id === "materials" ? materials.length :
                t.id === "gallery" ? gallery.length :
                t.id === "survey" ? surveys.length :
                t.id === "comments" ? comments.length :
                t.id === "testimonies" ? testimonies.length :
                t.id === "conversations" ? conversations.length : undefined;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.id)}
                  className="px-3.5 py-3 text-[13px] font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5"
                  style={{
                    borderColor: active ? "var(--brand)" : "transparent",
                    color: active ? "var(--brand-ink)" : "var(--muted)",
                  }}
                >
                  {t.label}
                  {count !== undefined && count > 0 && (
                    <span className="badge" style={{ background: "var(--surface-2)", color: "var(--muted)", padding: "1px 7px", fontSize: "10.5px" }}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-5">
          {tab === "overview" && <OverviewTab event={event} canFinancial={canFinancial} participants={participants} profiles={profiles} follows={follows} materials={materials} contacts={contacts} partnerships={partnerships} />}
          {tab === "goals" && <GoalsTab eventId={event.id} goals={goals} profiles={profiles} canWrite={canWrite} />}
          {tab === "daily" && <DailyReportsTab event={event} reports={dailyReports} canWrite={canWrite} profiles={profiles} />}
          {tab === "attendance" && <AttendanceTab event={event} reports={dailyReports} />}
          {tab === "reach" && <ReachTab event={event} platforms={eventPlatforms} follows={follows} canWrite={canWrite} />}
          {tab === "contacts" && <ContactsTab eventId={event.id} contacts={contacts} profiles={profiles} canWrite={canWrite} />}
          {tab === "partnerships" && <PartnershipsTab eventId={event.id} partnerships={partnerships} profiles={profiles} canWrite={canWrite} />}
          {tab === "testimonies" && <LinkedListTab items={testimonies.map((t) => ({ id: t.id, title: t.author_name || "Anonymous", subtitle: t.country, body: t.summary, date: t.content_date }))} icon={MessageSquareQuote} emptyLabel="testimonies" />}
          {tab === "conversations" && <LinkedListTab items={conversations.map((c) => ({ id: c.id, title: c.person_name || "Anonymous", subtitle: `${c.platform} · ${c.country}`, body: c.summary, date: c.content_date }))} icon={MessagesSquare} emptyLabel="conversations" />}
          {tab === "materials" && <MaterialsTab eventId={event.id} materials={materials} canWrite={canWrite} />}
          {tab === "gallery" && <GalleryTab eventId={event.id} images={gallery} canWrite={canWrite} readOnly={!canWrite} />}
          {tab === "survey" && <SurveyTab eventId={event.id} surveys={surveys} canWrite={canWrite} />}
          {tab === "comments" && <CommentsTab eventId={event.id} comments={comments} currentUserId={currentUserId} isAdmin={role === "super_admin" || role === "admin"} profiles={profiles} />}
          {tab === "activity" && <ActivityTab activity={activity} />}
        </div>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Event" wide>
        <EventForm
          event={event}
          partners={[]}
          channels={channels}
          profiles={profiles}
          eventTypes={[]}
          onDone={() => { setEditOpen(false); router.refresh(); }}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>
    </div>
  );
}

// ================= Overview =================
function OverviewTab({ event, canFinancial, participants, profiles, follows, materials, contacts, partnerships }: {
  event: EventRow; canFinancial: boolean; participants: EventParticipant[];
  profiles: Profile[]; follows: SocialFollow[]; materials: EventMaterial[]; contacts: EventContact[]; partnerships: EventPartnership[];
}) {
  const totalMaterials = materials.reduce((s, m) => s + Number(m.quantity), 0);
  return (
    <div className="space-y-5">
      {event.description && <p className="text-[13.5px] text-slate-600 leading-relaxed max-w-3xl">{event.description}</p>}

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 180px), 1fr))" }}>
        <MiniStat icon={Users} label="Total Attendees" value={formatNumber(event.adults + event.children)} />
        <MiniStat icon={UserCheck} label="Adults" value={formatNumber(event.adults)} />
        <MiniStat icon={Baby} label="Children" value={formatNumber(event.children)} />
        <MiniStat icon={Activity} label="Field Team" value={formatNumber(event.staff_count + event.volunteer_count)} hint={`${event.staff_count} staff · ${event.volunteer_count} volunteers`} />
        <MiniStat icon={Eye} label="Views" value={formatNumber(event.views)} />
        <MiniStat icon={ThumbsUp} label="Likes" value={formatNumber(event.likes)} />
        <MiniStat icon={Contact} label="Contacts" value={formatNumber(contacts.length)} />
        <MiniStat icon={Handshake} label="Partnerships" value={formatNumber(partnerships.length)} />
        <MiniStat icon={Package} label="Materials" value={formatNumber(totalMaterials)} />
        <MiniStat icon={Megaphone} label="New Follows" value={formatNumber(follows.reduce((s, f) => s + f.follows_gained, 0))} />
      </div>

      {canFinancial && (
        <div className="rounded-xl p-4 border" style={{ background: "var(--gold-soft)", borderColor: "#fcd34d" }}>
          <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-amber-800 mb-3">
            <Banknote size={14} /> Financial (restricted)
          </p>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
            <div><p className="text-[11px] text-amber-700">Budget</p><p className="text-[16px] font-bold">{formatMoney(event.budget, event.currency)}</p></div>
            <div><p className="text-[11px] text-amber-700">Actual Cost</p><p className="text-[16px] font-bold">{formatMoney(event.actual_cost, event.currency)}</p></div>
            <div><p className="text-[11px] text-amber-700">Cost / Attendee</p><p className="text-[16px] font-bold">{event.actual_cost && event.adults + event.children > 0 ? formatMoney(event.actual_cost / (event.adults + event.children), event.currency) : "—"}</p></div>
          </div>
          {event.cost_notes && <p className="text-[12px] text-amber-800 mt-2">{event.cost_notes}</p>}
        </div>
      )}

      <div>
        <h3 className="font-semibold text-[14px] mb-3">Team ({participants.length})</h3>
        {participants.length === 0 ? (
          <p className="text-[13px] text-slate-400">No participants assigned yet.</p>
        ) : (
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))" }}>
            {participants.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border p-3">
                <Avatar name={p.profiles?.full_name ?? "?"} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold truncate">{p.profiles?.full_name}</p>
                  <p className="text-[11.5px] text-slate-500 truncate">{p.responsibility || p.profiles?.role?.replace("_", " ")}</p>
                </div>
                <StatusBadge status={p.participation_status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border p-3.5">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500"><Icon size={12} /> {label}</p>
      <p className="text-[19px] font-bold mt-1 tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

// ================= Goals =================
function GoalsTab({ eventId, goals, profiles, canWrite }: { eventId: string; goals: EventGoal[]; profiles: Profile[]; canWrite: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EventGoal | null>(null);
  const [form, setForm] = useState({ goal: "", target: "0", current_value: "0", unit: "", deadline: "", responsible_id: "", status: "Not Started", notes: "" });

  const openNew = () => { setEditing(null); setForm({ goal: "", target: "0", current_value: "0", unit: "", deadline: "", responsible_id: "", status: "Not Started", notes: "" }); setOpen(true); };
  const openEdit = (g: EventGoal) => {
    setEditing(g);
    setForm({ goal: g.goal, target: String(g.target), current_value: String(g.current_value), unit: g.unit, deadline: g.deadline ?? "", responsible_id: g.responsible_id ?? "", status: g.status, notes: g.notes });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const sb = createClient();
    const payload = {
      event_id: eventId,
      goal: form.goal,
      target: Number(form.target),
      current_value: Number(form.current_value),
      unit: form.unit,
      deadline: form.deadline || null,
      responsible_id: form.responsible_id || null,
      status: form.status,
      notes: form.notes,
    };
    const { error } = editing
      ? await sb.from("event_goals").update(payload).eq("id", editing.id)
      : await sb.from("event_goals").insert(payload);
    if (error) { toast(error.message, "error"); return; }
    toast(editing ? "Goal updated" : "Goal added");
    setOpen(false);
    router.refresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[14px]">Goals / Pipeline ({goals.length})</h3>
        {canWrite && <button onClick={openNew} className="btn btn-primary btn-sm"><Plus size={14} /> Add Goal</button>}
      </div>
      {goals.length === 0 ? (
        <EmptyState icon={Target} title="No goals configured" description="Define measurable goals to track this event's pipeline." action={canWrite ? <button onClick={openNew} className="btn btn-primary btn-sm"><Plus size={14} /> Add Goal</button> : undefined} />
      ) : (
        <div className="space-y-4">
          {goals.map((g) => (
            <div key={g.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="font-semibold text-[13.5px]">{g.goal}</p>
                  <p className="text-[12px] text-slate-500 mt-0.5">
                    {g.responsible_id && profiles.find((p) => p.id === g.responsible_id)?.full_name}
                    {g.deadline && ` · due ${formatDate(g.deadline)}`}
                    {g.unit && ` · in ${g.unit}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={g.status} />
                  {canWrite && <button className="btn btn-ghost btn-sm" onClick={() => openEdit(g)}><Pencil size={13} /></button>}
                </div>
              </div>
              <ProgressBar value={Number(g.current_value)} max={Number(g.target)} />
              {g.notes && <p className="text-[12px] text-slate-500 mt-2">{g.notes}</p>}
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit Goal" : "Add Goal"}>
        <form onSubmit={save} className="space-y-3" noValidate>
          <div>
            <label className="label">Goal *</label>
            <input className="input" required value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} placeholder="Build relationships with 5 new churches" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Target *</label><input className="input" type="number" min={0} required value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} /></div>
            <div><label className="label">Current Value</label><input className="input" type="number" min={0} value={form.current_value} onChange={(e) => setForm({ ...form, current_value: e.target.value })} /></div>
            <div><label className="label">Unit</label><input className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="partnerships / attendees / views" /></div>
            <div><label className="label">Deadline</label><input className="input" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
            <div><label className="label">Responsible</label>
              <select className="select" value={form.responsible_id} onChange={(e) => setForm({ ...form, responsible_id: e.target.value })}>
                <option value="">—</option>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
            <div><label className="label">Status</label>
              <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {GOAL_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label">Notes</label><textarea className="textarea" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn btn-primary">{editing ? "Save" : "Add Goal"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ================= Daily Reports =================
function DailyReportsTab({ event, reports, canWrite, profiles }: { event: EventRow; reports: DailyReport[]; canWrite: boolean; profiles: Profile[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DailyReport | null>(null);

  const days = eventDays(event.start_date, event.end_date);
  const dates = useMemo(() => {
    const list: string[] = [];
    const d = new Date(event.start_date);
    for (let i = 0; i < days; i++) { list.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1); }
    return list;
  }, [event.start_date, days]);

  const missing = dates.filter((d) => !reports.some((r) => r.report_date === d));

  const [form, setForm] = useState<Record<string, string>>({});

  const openFor = (date: string, dayNumber: number) => {
    setEditing(null);
    setForm({
      report_date: date, day_number: String(dayNumber), location: event.city || "",
      staff_present: "0", volunteers: "0", adults: "0", children: "0",
      activities: "", meetings: "", contacts_collected: "0", partnerships_discussed: "0",
      materials_distributed: "0", digital_engagement: "", problems: "", successes: "",
      follow_up_actions: "", comments: "",
    });
    setOpen(true);
  };

  const openEdit = (r: DailyReport) => {
    setEditing(r);
    setForm({
      report_date: r.report_date, day_number: String(r.day_number), location: r.location,
      staff_present: String(r.staff_present), volunteers: String(r.volunteers),
      adults: String(r.adults), children: String(r.children),
      activities: r.activities, meetings: r.meetings,
      contacts_collected: String(r.contacts_collected), partnerships_discussed: String(r.partnerships_discussed),
      materials_distributed: String(r.materials_distributed),
      digital_engagement: r.digital_engagement, problems: r.problems, successes: r.successes,
      follow_up_actions: r.follow_up_actions, comments: r.comments,
    });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const sb = createClient();
    const payload = {
      event_id: event.id,
      report_date: form.report_date,
      day_number: Number(form.day_number),
      location: form.location,
      staff_present: Number(form.staff_present || 0),
      volunteers: Number(form.volunteers || 0),
      adults: Number(form.adults || 0),
      children: Number(form.children || 0),
      activities: form.activities, meetings: form.meetings,
      contacts_collected: Number(form.contacts_collected || 0),
      partnerships_discussed: Number(form.partnerships_discussed || 0),
      materials_distributed: Number(form.materials_distributed || 0),
      digital_engagement: form.digital_engagement,
      problems: form.problems, successes: form.successes,
      follow_up_actions: form.follow_up_actions, comments: form.comments,
    };
    const { error } = editing
      ? await sb.from("event_daily_reports").update(payload).eq("id", editing.id)
      : await sb.from("event_daily_reports").insert(payload);
    if (error) { toast(error.message, "error"); return; }
    toast(editing ? "Daily report updated" : "Daily report submitted");
    setOpen(false);
    router.refresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[14px]">Daily Reports — {reports.length}/{days} day{days === 1 ? "" : "s"} submitted</h3>
        {canWrite && missing.length > 0 && (
          <button className="btn btn-primary btn-sm" onClick={() => openFor(missing[0]!, dates.indexOf(missing[0]!) + 1)}>
            <Plus size={14} /> Submit {formatDate(missing[0])}
          </button>
        )}
      </div>

      {/* day timeline */}
      <div className="space-y-3">
        {dates.map((date, i) => {
          const report = reports.find((r) => r.report_date === date);
          return (
            <div key={date} className="rounded-xl border p-4 flex flex-wrap items-center gap-3">
              <div className="w-11 h-11 rounded-xl grid place-items-center shrink-0" style={{ background: report ? "var(--green-soft)" : "var(--surface-2)", color: report ? "#047857" : "var(--muted)" }}>
                <span className="text-[15px] font-bold">{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[13.5px]">Day {i + 1} · {formatDate(date)}</p>
                {report ? (
                  <p className="text-[12px] text-slate-500 truncate">
                    {report.adults + report.children} attendees · {report.contacts_collected} contacts · {report.materials_distributed} materials
                    {report.problems && " · ⚠ issues logged"}
                  </p>
                ) : (
                  <p className="text-[12px] text-slate-400">No report submitted yet</p>
                )}
              </div>
              {report ? (
                <div className="flex items-center gap-2">
                  <details className="text-[13px]">
                    <summary className="btn btn-secondary btn-sm cursor-pointer list-none">View</summary>
                    <div className="mt-3 rounded-xl border p-4 text-left" style={{ minWidth: "min(85vw, 520px)" }}>
                      <DailyReportBody r={report} profiles={profiles} />
                    </div>
                  </details>
                  {canWrite && <button className="btn btn-ghost btn-sm" onClick={() => openEdit(report)}><Pencil size={13} /></button>}
                </div>
              ) : (
                canWrite && <button className="btn btn-secondary btn-sm" onClick={() => openFor(date, i + 1)}>Submit Report</button>
              )}
            </div>
          );
        })}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Edit Day ${editing.day_number} Report` : "Submit Daily Report"} wide>
        <form onSubmit={save} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><label className="label">Date</label><input className="input" type="date" required value={form.report_date} onChange={(e) => setForm({ ...form, report_date: e.target.value })} /></div>
            <div className="sm:col-span-3"><label className="label">Location</label><input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <div><label className="label">Staff Present</label><input className="input" type="number" min={0} value={form.staff_present} onChange={(e) => setForm({ ...form, staff_present: e.target.value })} /></div>
            <div><label className="label">Volunteers</label><input className="input" type="number" min={0} value={form.volunteers} onChange={(e) => setForm({ ...form, volunteers: e.target.value })} /></div>
            <div><label className="label">Adults</label><input className="input" type="number" min={0} value={form.adults} onChange={(e) => setForm({ ...form, adults: e.target.value })} /></div>
            <div><label className="label">Children</label><input className="input" type="number" min={0} value={form.children} onChange={(e) => setForm({ ...form, children: e.target.value })} /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="label">Activities Performed</label><textarea className="textarea" rows={2} value={form.activities} onChange={(e) => setForm({ ...form, activities: e.target.value })} /></div>
            <div><label className="label">Meetings</label><textarea className="textarea" rows={2} value={form.meetings} onChange={(e) => setForm({ ...form, meetings: e.target.value })} /></div>
            <div><label className="label">Contacts Collected</label><input className="input" type="number" min={0} value={form.contacts_collected} onChange={(e) => setForm({ ...form, contacts_collected: e.target.value })} /></div>
            <div><label className="label">Partnerships Discussed</label><input className="input" type="number" min={0} value={form.partnerships_discussed} onChange={(e) => setForm({ ...form, partnerships_discussed: e.target.value })} /></div>
            <div><label className="label">Materials Distributed</label><input className="input" type="number" min={0} value={form.materials_distributed} onChange={(e) => setForm({ ...form, materials_distributed: e.target.value })} /></div>
            <div><label className="label">Digital Engagement</label><input className="input" value={form.digital_engagement} onChange={(e) => setForm({ ...form, digital_engagement: e.target.value })} placeholder="Livestream reached 12k viewers" /></div>
            <div><label className="label">Problems / Issues</label><textarea className="textarea" rows={2} value={form.problems} onChange={(e) => setForm({ ...form, problems: e.target.value })} /></div>
            <div><label className="label">Successes</label><textarea className="textarea" rows={2} value={form.successes} onChange={(e) => setForm({ ...form, successes: e.target.value })} /></div>
            <div><label className="label">Follow-up Actions</label><textarea className="textarea" rows={2} value={form.follow_up_actions} onChange={(e) => setForm({ ...form, follow_up_actions: e.target.value })} /></div>
            <div><label className="label">Comments</label><textarea className="textarea" rows={2} value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn btn-primary">{editing ? "Save Report" : "Submit Report"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function DailyReportBody({ r, profiles }: { r: DailyReport; profiles: Profile[] }) {
  const submitter = profiles.find((p) => p.id === r.submitted_by);
  return (
    <div className="space-y-3 text-[13px]">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          ["Staff", r.staff_present], ["Volunteers", r.volunteers],
          ["Adults", r.adults], ["Children", r.children],
          ["Contacts", r.contacts_collected], ["Partnerships", r.partnerships_discussed],
          ["Materials", r.materials_distributed], ["Total", r.adults + r.children],
        ].map(([l, v]) => (
          <div key={String(l)} className="rounded-lg p-2" style={{ background: "var(--surface-2)" }}>
            <p className="text-[10.5px] text-slate-500 uppercase font-semibold">{l}</p>
            <p className="font-bold text-[15px] tabular-nums">{v}</p>
          </div>
        ))}
      </div>
      {[
        ["Activities", r.activities], ["Meetings", r.meetings], ["Digital Engagement", r.digital_engagement],
        ["Successes", r.successes], ["Problems", r.problems], ["Follow-up Actions", r.follow_up_actions], ["Comments", r.comments],
      ].filter(([, v]) => v).map(([l, v]) => (
        <div key={String(l)}>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{l}</p>
          <p className="text-slate-700 mt-0.5 whitespace-pre-wrap">{v}</p>
        </div>
      ))}
      <p className="text-[11.5px] text-slate-400 border-t pt-2">
        Submitted by {submitter?.full_name ?? "—"} · {formatDateTime(r.submitted_at)}
      </p>
    </div>
  );
}

// ================= Attendance =================
function AttendanceTab({ event, reports }: { event: EventRow; reports: DailyReport[] }) {
  const csv = () => downloadCsv(`attendance-${event.name}.csv`, reports.map((r) => ({
    Day: r.day_number, Date: r.report_date, Location: r.location,
    Staff: r.staff_present, Volunteers: r.volunteers, Adults: r.adults, Children: r.children,
    Total: r.adults + r.children,
  })));
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[14px]">Attendance</h3>
        {reports.length > 0 && <button onClick={csv} className="btn btn-secondary btn-sm"><Download size={13} /> Export CSV</button>}
      </div>
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 150px), 1fr))" }}>
        <MiniStat icon={Users} label="Total" value={formatNumber(event.adults + event.children)} />
        <MiniStat icon={UserCheck} label="Adults" value={formatNumber(event.adults)} />
        <MiniStat icon={Baby} label="Children" value={formatNumber(event.children)} />
        <MiniStat icon={Activity} label="Avg / Day" value={reports.length ? formatNumber(Math.round(reports.reduce((s, r) => s + r.adults + r.children, 0) / reports.length)) : "—"} />
      </div>
      {reports.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No daily reports yet" description="Attendance by day appears once daily reports are submitted." />
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Day</th><th>Date</th><th>Staff</th><th>Volunteers</th><th>Adults</th><th>Children</th><th className="text-right">Total</th></tr></thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td className="font-semibold">Day {r.day_number}</td>
                  <td>{formatDate(r.report_date)}</td>
                  <td className="tabular-nums">{r.staff_present}</td>
                  <td className="tabular-nums">{r.volunteers}</td>
                  <td className="tabular-nums">{r.adults}</td>
                  <td className="tabular-nums">{r.children}</td>
                  <td className="text-right tabular-nums font-semibold">{r.adults + r.children}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ================= Reach & Engagement =================
function ReachTab({ event, platforms, follows, canWrite }: { event: EventRow; platforms: { id: string; name: string; color: string }[]; follows: SocialFollow[]; canWrite: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ platform: "Facebook", channel: "", follows_gained: "0", follow_date: new Date().toISOString().slice(0, 10), source_campaign: event.campaign_tag });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await createClient().from("event_social_follows").insert({
      event_id: event.id, platform: form.platform, channel: form.channel,
      follows_gained: Number(form.follows_gained), follow_date: form.follow_date, source_campaign: form.source_campaign,
    });
    if (error) { toast(error.message, "error"); return; }
    toast("Social follows recorded");
    setOpen(false);
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 170px), 1fr))" }}>
        <MiniStat icon={Eye} label="Story / Post Views" value={formatNumber(event.views)} />
        <MiniStat icon={Eye} label="Unique Views" value={formatNumber(event.unique_views)} />
        <MiniStat icon={Share2} label="Shares" value={formatNumber(event.shares)} />
        <MiniStat icon={MessageSquare} label="Comments" value={formatNumber(event.comments_count)} />
        <MiniStat icon={ThumbsUp} label="Likes" value={formatNumber(event.likes)} />
        <MiniStat icon={Megaphone} label="New Follows" value={formatNumber(follows.reduce((s, f) => s + f.follows_gained, 0))} />
      </div>

      <div>
        <p className="label">Platforms Reached</p>
        <div className="flex flex-wrap gap-1.5">
          {platforms.length === 0 ? <span className="text-[13px] text-slate-400">No platforms recorded.</span> :
            platforms.map((p) => <Tag key={p.id} color={p.color}>{p.name}</Tag>)}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[14px]">New Social Follows</h3>
          {canWrite && <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}><Plus size={14} /> Record Follows</button>}
        </div>
        {follows.length === 0 ? (
          <p className="text-[13px] text-slate-400">No social follows recorded for this event.</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Platform</th><th>Channel</th><th className="text-right">Follows Gained</th><th>Date</th><th>Campaign</th></tr></thead>
              <tbody>
                {follows.map((f) => (
                  <tr key={f.id}>
                    <td><Tag>{f.platform}</Tag></td>
                    <td>{f.channel || "—"}</td>
                    <td className="text-right tabular-nums font-semibold">{f.follows_gained}</td>
                    <td>{formatDate(f.follow_date)}</td>
                    <td className="text-slate-500">{f.source_campaign || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Record Social Follows">
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Platform</label>
              <select className="select" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                {["Facebook", "Instagram", "YouTube", "SAT-7 Plus", "Website", "TikTok", "Other"].map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div><label className="label">Channel</label><input className="input" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} placeholder="SAT-7 KIDS" /></div>
            <div><label className="label">Follows Gained</label><input className="input" type="number" min={0} required value={form.follows_gained} onChange={(e) => setForm({ ...form, follows_gained: e.target.value })} /></div>
            <div><label className="label">Date</label><input className="input" type="date" value={form.follow_date} onChange={(e) => setForm({ ...form, follow_date: e.target.value })} /></div>
          </div>
          <div><label className="label">Source / Campaign</label><input className="input" value={form.source_campaign} onChange={(e) => setForm({ ...form, source_campaign: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn btn-primary">Save</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ================= Contacts =================
function ContactsTab({ eventId, contacts, profiles, canWrite }: { eventId: string; contacts: EventContact[]; profiles: Profile[]; canWrite: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", contact_type: "Church Leader", source: "", contact_date: new Date().toISOString().slice(0, 10), email: "", phone: "", is_minor: false, parental_consent: false, follow_up_status: "New", assigned_to: "", notes: "" });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.is_minor && !form.parental_consent) {
      toast("Parental consent is required for contacts under 18.", "error");
      return;
    }
    const { error } = await createClient().from("event_contacts").insert({
      event_id: eventId, ...form,
      assigned_to: form.assigned_to || null,
    });
    if (error) { toast(error.message, "error"); return; }
    toast("Contact added");
    setOpen(false);
    router.refresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[14px]">Leads & Contacts ({contacts.length})</h3>
        {canWrite && <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}><Plus size={14} /> Add Contact</button>}
      </div>
      {contacts.length === 0 ? (
        <EmptyState icon={Contact} title="No contacts yet" description="Contacts collected at this event will appear here." />
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Name</th><th>Type</th><th>Date</th><th>Consent</th><th>Follow-up</th><th>Assigned</th></tr></thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.name}</td>
                  <td>{c.contact_type}</td>
                  <td>{formatDate(c.contact_date)}</td>
                  <td>
                    {c.is_minor ? (
                      c.parental_consent
                        ? <Tag color="#059669">Minor · Consent ✓</Tag>
                        : <Tag color="#dc2626">Minor · No consent</Tag>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td><StatusBadge status={c.follow_up_status} /></td>
                  <td>{c.profiles?.full_name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[11.5px] text-slate-400 mt-3">
        🔒 Contact details for minors are restricted. Names and contact info are only visible to authorized roles.
      </p>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Contact">
        <form onSubmit={save} className="space-y-3" noValidate>
          <div><label className="label">Name (where permitted)</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Contact Type</label>
              <select className="select" value={form.contact_type} onChange={(e) => setForm({ ...form, contact_type: e.target.value })}>
                {["Church Leader", "Teacher", "Parent", "Student", "NGO", "Other"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="label">Follow-up Status</label>
              <select className="select" value={form.follow_up_status} onChange={(e) => setForm({ ...form, follow_up_status: e.target.value })}>
                {FOLLOW_UP_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div><label className="label">Assigned To</label>
            <select className="select" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}>
              <option value="">—</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>
          <div className="rounded-xl border p-3 space-y-2" style={{ background: "var(--surface-2)" }}>
            <label className="flex items-center gap-2 text-[13px] cursor-pointer">
              <input type="checkbox" checked={form.is_minor} onChange={(e) => setForm({ ...form, is_minor: e.target.checked })} className="accent-blue-700" />
              This contact is under 18
            </label>
            {form.is_minor && (
              <label className="flex items-center gap-2 text-[13px] cursor-pointer" style={{ color: form.parental_consent ? "#047857" : "#b91c1c" }}>
                <input type="checkbox" checked={form.parental_consent} onChange={(e) => setForm({ ...form, parental_consent: e.target.checked })} className="accent-blue-700" />
                Parental consent on file (required)
              </label>
            )}
          </div>
          <div><label className="label">Notes</label><textarea className="textarea" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn btn-primary">Add Contact</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ================= Partnerships =================
function PartnershipsTab({ eventId, partnerships, profiles, canWrite }: { eventId: string; partnerships: EventPartnership[]; profiles: Profile[]; canWrite: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ organization: "", partnership_type: "Church", country: "", city: "", contact_person: "", status: "Prospect", follow_up_date: "", responsible_id: "", notes: "" });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await createClient().from("event_partnerships").insert({
      event_id: eventId, ...form,
      follow_up_date: form.follow_up_date || null,
      responsible_id: form.responsible_id || null,
    });
    if (error) { toast(error.message, "error"); return; }
    toast("Partnership added");
    setOpen(false);
    router.refresh();
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await createClient().from("event_partnerships").update({ status }).eq("id", id);
    if (error) { toast(error.message, "error"); return; }
    toast(`Moved to ${status}`);
    router.refresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[14px]">Partnerships ({partnerships.length})</h3>
        {canWrite && <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}><Plus size={14} /> Add Partnership</button>}
      </div>
      {partnerships.length === 0 ? (
        <EmptyState icon={Handshake} title="No partnerships" description="Track organizations you engage with at this event." />
      ) : (
        <div className="space-y-3">
          {partnerships.map((p) => (
            <div key={p.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-[13.5px]">{p.organization}</p>
                  <p className="text-[12px] text-slate-500">
                    {p.partnership_type} · {[p.city, p.country].filter(Boolean).join(", ")}
                    {p.contact_person && ` · ${p.contact_person}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={p.status} />
                  {canWrite && (
                    <select className="select" style={{ width: "auto", padding: "4px 8px", fontSize: "12px" }} value={p.status} onChange={(e) => setStatus(p.id, e.target.value)} aria-label="Change status">
                      {PARTNERSHIP_STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  )}
                </div>
              </div>
              {p.notes && <p className="text-[12.5px] text-slate-600 mt-2">{p.notes}</p>}
              <div className="flex gap-4 mt-2 text-[11.5px] text-slate-400">
                {p.follow_up_date && <span>Follow-up: {formatDate(p.follow_up_date)}</span>}
                {p.responsible_id && <span>Responsible: {profiles.find((x) => x.id === p.responsible_id)?.full_name}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add Partnership">
        <form onSubmit={save} className="space-y-3" noValidate>
          <div><label className="label">Organization *</label><input className="input" required value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Type</label>
              <select className="select" value={form.partnership_type} onChange={(e) => setForm({ ...form, partnership_type: e.target.value })}>
                {["Church", "Diocese", "School", "NGO", "Other"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="label">Status</label>
              <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {PARTNERSHIP_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><label className="label">Country</label><input className="input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
            <div><label className="label">City</label><input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div><label className="label">Contact Person</label><input className="input" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></div>
            <div><label className="label">Follow-up Date</label><input className="input" type="date" value={form.follow_up_date} onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })} /></div>
          </div>
          <div><label className="label">Responsible</label>
            <select className="select" value={form.responsible_id} onChange={(e) => setForm({ ...form, responsible_id: e.target.value })}>
              <option value="">—</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>
          <div><label className="label">Notes</label><textarea className="textarea" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn btn-primary">Add</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ================= Materials =================
function MaterialsTab({ eventId, materials, canWrite }: { eventId: string; materials: EventMaterial[]; canWrite: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ item: "", quantity: "0", unit: "pcs", notes: "" });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await createClient().from("event_materials").insert({
      event_id: eventId, item: form.item, quantity: Number(form.quantity), unit: form.unit, notes: form.notes,
    });
    if (error) { toast(error.message, "error"); return; }
    toast("Material added");
    setOpen(false);
    router.refresh();
  };

  const remove = async (id: string) => {
    const { error } = await createClient().from("event_materials").delete().eq("id", id);
    if (error) { toast(error.message, "error"); return; }
    toast("Material removed");
    router.refresh();
  };

  const total = materials.reduce((s, m) => s + Number(m.quantity), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[14px]">Materials ({materials.length} types · {formatNumber(total)} total)</h3>
        {canWrite && <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}><Plus size={14} /> Add Material</button>}
      </div>
      {materials.length === 0 ? (
        <EmptyState icon={Package} title="No materials recorded" description="Track storybooks, bookmarks and other materials distributed at this event." />
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Item</th><th className="text-right">Quantity</th><th>Unit</th><th>Notes</th>{canWrite && <th></th>}</tr></thead>
            <tbody>
              {materials.map((m) => (
                <tr key={m.id}>
                  <td className="font-medium">{m.item}</td>
                  <td className="text-right tabular-nums font-semibold">{formatNumber(Number(m.quantity))}</td>
                  <td>{m.unit}</td>
                  <td className="text-slate-500">{m.notes || "—"}</td>
                  {canWrite && (
                    <td><button className="btn btn-ghost btn-sm hover:!text-red-600" onClick={() => remove(m.id)} aria-label="Delete"><Trash2 size={13} /></button></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add Material">
        <form onSubmit={save} className="space-y-3" noValidate>
          <div><label className="label">Item *</label><input className="input" required value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} placeholder="Storybooks" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Quantity *</label><input className="input" type="number" min={0} required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
            <div><label className="label">Unit</label>
              <select className="select" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                {["pcs", "books", "boxes", "sheets", "packs"].map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label">Notes</label><input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn btn-primary">Add</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ================= Linked testimonies/conversations =================
function LinkedListTab({ items, icon: Icon, emptyLabel }: {
  items: { id: string; title: string; subtitle: string; body: string; date: string | null }[];
  icon: LucideIcon;
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <EmptyState icon={Icon} title={`No ${emptyLabel} linked`} description={`${emptyLabel[0].toUpperCase() + emptyLabel.slice(1)} recorded on the Insights Portal for this event will appear here.`} />;
  }
  return (
    <div className="space-y-3">
      {items.map((t) => (
        <div key={t.id} className="rounded-xl border p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-[13.5px]">{t.title}</p>
            <span className="text-[11.5px] text-slate-400">{formatDate(t.date)}</span>
          </div>
          <p className="text-[11.5px] text-slate-500">{t.subtitle}</p>
          <p className="text-[13px] text-slate-700 mt-2">{t.body}</p>
        </div>
      ))}
    </div>
  );
}

// ================= Survey =================
function SurveyTab({ eventId, surveys, canWrite }: { eventId: string; surveys: EventSurvey[]; canWrite: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    respondent_name: "", respondent_role: "Participant",
    overall_experience: 5, organization_rating: 5, communication_rating: 5, event_value_rating: 5,
    would_participate_again: "Yes", what_worked: "", what_to_improve: "", additional_comments: "",
  });

  const avg = (key: keyof EventSurvey) =>
    surveys.length ? (surveys.reduce((s, x) => s + (x[key] as number), 0) / surveys.length).toFixed(1) : "—";

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await createClient().from("event_surveys").insert({ event_id: eventId, ...form });
    if (error) { toast(error.message, "error"); return; }
    toast("Survey submitted");
    setOpen(false);
    router.refresh();
  };

  const StarPicker = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
    <div>
      <p className="label">{label}</p>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} stars`} className="transition-transform hover:scale-110">
            <Star size={22} className={n <= value ? "text-amber-400" : "text-slate-300"} fill={n <= value ? "currentColor" : "none"} />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[14px]">Survey Results ({surveys.length} response{surveys.length === 1 ? "" : "s"})</h3>
        {canWrite && <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}><Plus size={14} /> Submit Survey</button>}
      </div>

      {surveys.length === 0 ? (
        <EmptyState icon={MessageSquareQuote} title="No survey responses" description="Collect participant feedback after the event." />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 160px), 1fr))" }}>
            {[
              ["Overall Experience", avg("overall_experience")],
              ["Organization", avg("organization_rating")],
              ["Communication", avg("communication_rating")],
              ["Event Value", avg("event_value_rating")],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border p-4 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                <p className="text-[26px] font-bold mt-1" style={{ color: "#f59e0b" }}>{value}<span className="text-[14px] text-slate-400">/5</span></p>
              </div>
            ))}
            <div className="rounded-xl border p-4 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Would Join Again</p>
              <p className="text-[15px] font-bold mt-2">
                {(() => {
                  const yes = surveys.filter((s) => s.would_participate_again === "Yes").length;
                  return `${Math.round((yes / surveys.length) * 100)}% Yes`;
                })()}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {surveys.map((s) => (
              <div key={s.id} className="rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-[13px]">{s.respondent_name || "Anonymous"} <span className="font-normal text-slate-400">· {s.respondent_role}</span></p>
                  <StatusBadge status={s.would_participate_again} />
                </div>
                <p className="text-[12px] text-slate-500 mt-0.5">
                  Overall {s.overall_experience}/5 · Org {s.organization_rating}/5 · Comm {s.communication_rating}/5 · Value {s.event_value_rating}/5
                </p>
                {s.what_worked && <p className="text-[12.5px] mt-2"><span className="font-semibold text-emerald-700">Worked well:</span> {s.what_worked}</p>}
                {s.what_to_improve && <p className="text-[12.5px] mt-1"><span className="font-semibold text-amber-700">Improve:</span> {s.what_to_improve}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Submit Survey Response" wide>
        <form onSubmit={save} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Respondent Name</label><input className="input" value={form.respondent_name} onChange={(e) => setForm({ ...form, respondent_name: e.target.value })} /></div>
            <div><label className="label">Role</label>
              <select className="select" value={form.respondent_role} onChange={(e) => setForm({ ...form, respondent_role: e.target.value })}>
                {["Participant", "Partner", "Volunteer", "Staff"].map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <StarPicker label="Overall Experience" value={form.overall_experience} onChange={(v) => setForm({ ...form, overall_experience: v })} />
            <StarPicker label="Organization" value={form.organization_rating} onChange={(v) => setForm({ ...form, organization_rating: v })} />
            <StarPicker label="Communication" value={form.communication_rating} onChange={(v) => setForm({ ...form, communication_rating: v })} />
            <StarPicker label="Event Value" value={form.event_value_rating} onChange={(v) => setForm({ ...form, event_value_rating: v })} />
          </div>
          <div>
            <p className="label">Would you participate again?</p>
            <div className="flex gap-2">
              {["Yes", "No", "Maybe"].map((v) => (
                <button key={v} type="button" onClick={() => setForm({ ...form, would_participate_again: v })}
                  className="badge" style={{ padding: "7px 16px", background: form.would_participate_again === v ? "var(--brand)" : "var(--surface-2)", color: form.would_participate_again === v ? "#fff" : "var(--muted)", fontSize: "13px" }}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div><label className="label">What worked well?</label><textarea className="textarea" rows={2} value={form.what_worked} onChange={(e) => setForm({ ...form, what_worked: e.target.value })} /></div>
          <div><label className="label">What could be improved?</label><textarea className="textarea" rows={2} value={form.what_to_improve} onChange={(e) => setForm({ ...form, what_to_improve: e.target.value })} /></div>
          <div><label className="label">Additional comments</label><textarea className="textarea" rows={2} value={form.additional_comments} onChange={(e) => setForm({ ...form, additional_comments: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn btn-primary">Submit Survey</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ================= Comments =================
function CommentsTab({ eventId, comments, currentUserId, isAdmin, profiles }: {
  eventId: string; comments: EventComment[]; currentUserId: string; isAdmin: boolean; profiles: Profile[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const roots = comments.filter((c) => !c.parent_id);
  const repliesOf = (id: string) => comments.filter((c) => c.parent_id === id);

  const submit = async (parentId: string | null) => {
    if (!body.trim()) return;
    setSending(true);
    // parse @mentions of profiles by name
    const mentions: string[] = [];
    for (const p of profiles) {
      if (body.includes(`@${p.full_name}`)) mentions.push(p.id);
    }
    const { error } = await createClient().from("event_comments").insert({
      event_id: eventId, parent_id: parentId, user_id: currentUserId, body: body.trim(), mentions,
    });
    setSending(false);
    if (error) { toast(error.message, "error"); return; }
    toast(parentId ? "Reply added" : "Comment added");
    setBody("");
    setReplyTo(null);
    router.refresh();
  };

  const remove = async (id: string) => {
    const { error } = await createClient().from("event_comments").update({ is_deleted: true }).eq("id", id);
    if (error) { toast(error.message, "error"); return; }
    toast("Comment deleted");
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-3">
        <textarea
          className="textarea" rows={2} placeholder="Write a comment… use @Name to mention someone"
          value={body} onChange={(e) => setBody(e.target.value)}
        />
        <div className="flex justify-end mt-2">
          <button className="btn btn-primary btn-sm" disabled={!body.trim() || sending} onClick={() => submit(replyTo)}>
            {replyTo ? "Reply" : "Comment"}
          </button>
        </div>
      </div>

      {roots.length === 0 && <p className="text-[13px] text-slate-400">No comments yet — start the discussion.</p>}

      <div className="space-y-4">
        {roots.map((c) => (
          <div key={c.id}>
            <CommentBubble c={c} onReply={() => { setReplyTo(c.id); }} onReplyCancel={() => setReplyTo(null)} replying={replyTo === c.id} canDelete={c.user_id === currentUserId || isAdmin} onDelete={() => remove(c.id)} />
            <div className="ml-8 mt-2 space-y-2 border-l-2 pl-4" style={{ borderColor: "var(--border)" }}>
              {repliesOf(c.id).map((r) => (
                <CommentBubble key={r.id} c={r} small onReply={undefined} onReplyCancel={undefined} replying={false} canDelete={r.user_id === currentUserId || isAdmin} onDelete={() => remove(r.id)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommentBubble({ c, small, onReply, onReplyCancel, replying, canDelete, onDelete }: {
  c: EventComment; small?: boolean; onReply?: () => void; onReplyCancel?: () => void;
  replying: boolean; canDelete: boolean; onDelete: () => void;
}) {
  return (
    <div className={small ? "rounded-xl border p-3" : "rounded-xl border p-4"}>
      <div className="flex items-start gap-3">
        <Avatar name={c.profiles?.full_name ?? "?"} size={small ? 26 : 32} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-[13px]">{c.profiles?.full_name ?? "Unknown"}</p>
            <span className="text-[11px] text-slate-400">{formatDateTime(c.created_at)}</span>
          </div>
          <p className="text-[13.5px] text-slate-700 mt-1 whitespace-pre-wrap">{c.body}</p>
          <div className="flex items-center gap-2 mt-2">
            {onReply && (
              <button className="text-[12px] font-medium text-blue-700 hover:underline" onClick={replying ? onReplyCancel : onReply}>
                {replying ? "Cancel reply" : "Reply"}
              </button>
            )}
            {canDelete && (
              <button className="text-[12px] font-medium text-red-600 hover:underline" onClick={onDelete}>Delete</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ================= Activity =================
function ActivityTab({ activity }: { activity: ActivityLogEntry[] }) {
  if (activity.length === 0) {
    return <EmptyState icon={Activity} title="No activity yet" description="Actions on this event will be logged here." />;
  }
  return (
    <div className="space-y-0">
      {activity.map((a, i) => (
        <div key={a.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-7 h-7 rounded-full grid place-items-center shrink-0" style={{ background: "var(--surface-2)", color: "var(--muted)" }}>
              <Activity size={13} />
            </div>
            {i < activity.length - 1 && <div className="w-px flex-1 my-1" style={{ background: "var(--border)" }} />}
          </div>
          <div className="pb-5 min-w-0">
            <p className="text-[13px]">
              <span className="font-semibold">{a.user_name || "System"}</span>{" "}
              <span className="text-slate-600">{a.action}</span>{" "}
              {a.entity_name && <span className="font-medium text-slate-800">{a.entity_name}</span>}
            </p>
            <p className="text-[11.5px] text-slate-400">{formatDateTime(a.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
