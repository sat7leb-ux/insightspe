"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { EventRow, Partner, Channel, Profile, EventTypeRow } from "@/lib/types";
import { EVENT_STATUSES, EVENT_TYPES, canWriteEvents, type UserRole } from "@/lib/types";
import { StatusBadge, Tag, EmptyState, PageHeader, TableSkeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { EventForm } from "./event-form";
import { FilterBar } from "@/components/events/filter-bar";
import { formatNumber, dateRangeLabel, eventDays, downloadCsv, cn } from "@/lib/utils";
import {
  CalendarDays, Plus, Search, Download, Copy, Archive, Pencil, Trash2, MapPin, Users,
} from "lucide-react";

export function EventsClient({
  events, partners, channels, profiles, eventTypes, role,
}: {
  events: EventRow[];
  partners: Partner[];
  channels: Channel[];
  profiles: Profile[];
  eventTypes: EventTypeRow[];
  role: UserRole;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  const canWrite = canWriteEvents(role);
  const isAdmin = role === "super_admin" || role === "admin";

  const [q, setQ] = useState(params.get("q") ?? "");
  const [filters, setFilters] = useState({
    country: params.get("country") ?? "",
    eventType: params.get("eventType") ?? "",
    partner: params.get("partner") ?? "",
    channel: params.get("channel") ?? "",
    status: params.get("status") ?? "",
    manager: params.get("manager") ?? "",
    campaign: params.get("campaign") ?? "",
    dateFrom: "",
    dateTo: "",
  });
  const [showArchived, setShowArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(params.get("new") === "1" || false);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = events;
    if (!showArchived) list = list.filter((e) => e.status !== "Archived");
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      list = list.filter((e) =>
        e.name.toLowerCase().includes(t) || e.city.toLowerCase().includes(t) ||
        e.country.toLowerCase().includes(t) || e.campaign_tag.toLowerCase().includes(t));
    }
    if (filters.country) list = list.filter((e) => e.country === filters.country);
    if (filters.eventType) list = list.filter((e) => e.event_type === filters.eventType);
    if (filters.partner) list = list.filter((e) => e.partner_id === filters.partner);
    if (filters.channel) list = list.filter((e) => e.channel_ids.includes(filters.channel));
    if (filters.status) list = list.filter((e) => e.status === filters.status);
    if (filters.manager) list = list.filter((e) => e.manager_id === filters.manager);
    if (filters.campaign) list = list.filter((e) => e.campaign_tag.toLowerCase().includes(filters.campaign.toLowerCase()));
    if (filters.dateFrom) list = list.filter((e) => e.end_date >= filters.dateFrom);
    if (filters.dateTo) list = list.filter((e) => e.start_date <= filters.dateTo);
    return list;
  }, [events, q, filters, showArchived]);

  const countries = useMemo(() => [...new Set(events.map((e) => e.country).filter(Boolean))].sort(), [events]);
  const campaigns = useMemo(() => [...new Set(events.map((e) => e.campaign_tag).filter(Boolean))].sort(), [events]);

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (e: EventRow) => { setEditing(e); setFormOpen(true); };

  const duplicate = async (e: EventRow) => {
    setBusy(e.id);
    try {
      const sb = createClient();
      const { id, created_at, updated_at, created_by, updated_by, ...rest } = e;
      const { data, error } = await sb.from("events").insert({ ...rest, name: `${e.name} (Copy)`, status: "Planning" }).select("id").single();
      if (error) throw error;
      toast(`Duplicated as “${e.name} (Copy)”`);
      router.push(`/events/${data.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not duplicate event", "error");
    } finally {
      setBusy(null);
    }
  };

  const archive = async (e: EventRow) => {
    setBusy(e.id);
    try {
      const sb = createClient();
      const { error } = await sb.from("events").update({ status: "Archived" }).eq("id", e.id);
      if (error) throw error;
      toast("Event archived");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not archive event", "error");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (e: EventRow) => {
    if (!confirm(`Delete “${e.name}” permanently? This removes all reports, gallery images and related data.`)) return;
    setBusy(e.id);
    try {
      const sb = createClient();
      const { error } = await sb.from("events").delete().eq("id", e.id);
      if (error) throw error;
      toast("Event deleted");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not delete — you may lack permission", "error");
    } finally {
      setBusy(null);
    }
  };

  const exportCsv = () => {
    downloadCsv("events.csv", filtered.map((e) => ({
      Name: e.name, Status: e.status, Type: e.event_type,
      Start: e.start_date, End: e.end_date, City: e.city, Country: e.country,
      Adults: e.adults, Children: e.children,
      Views: e.views, Likes: e.likes, Comments: e.comments_count, Shares: e.shares,
      Campaign: e.campaign_tag,
    })));
    toast("Events exported to CSV");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Events"
        description={`${filtered.length} event${filtered.length === 1 ? "" : "s"}`}
        actions={
          <>
            <button onClick={exportCsv} className="btn btn-secondary btn-sm">
              <Download size={14} /> Export CSV
            </button>
            {canWrite && (
              <button onClick={openNew} className="btn btn-primary btn-sm">
                <Plus size={15} /> New Event
              </button>
            )}
          </>
        }
      />

      <FilterBar
        q={q} setQ={setQ}
        filters={filters} setFilters={setFilters}
        countries={countries} eventTypes={EVENT_TYPES as unknown as string[]}
        partners={partners} channels={channels} profiles={profiles} campaigns={campaigns}
        showArchived={showArchived} setShowArchived={setShowArchived}
      />

      {/* table (desktop) / cards (mobile) */}
      <div className="card overflow-hidden">
        <div className="hidden md:block table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Event</th>
                <th>Status</th>
                <th>Date</th>
                <th>Location</th>
                <th>Type</th>
                <th>Channels</th>
                <th className="text-right">Attendees</th>
                <th className="text-right">Views</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const chTags = e.channel_ids.map((cid) => channels.find((c) => c.id === cid)).filter(Boolean);
                return (
                  <tr key={e.id} className={cn(busy === e.id && "opacity-50")}>
                    <td>
                      <Link href={`/events/${e.id}`} className="font-semibold text-[13.5px] hover:text-blue-700 hover:underline">
                        {e.name}
                      </Link>
                      {e.campaign_tag && <p className="text-[11.5px] text-slate-400">{e.campaign_tag}</p>}
                    </td>
                    <td><StatusBadge status={e.status} /></td>
                    <td className="whitespace-nowrap">
                      {dateRangeLabel(e.start_date, e.end_date)}
                      {eventDays(e.start_date, e.end_date) > 1 && (
                        <span className="text-[11px] text-slate-400 ml-1">({eventDays(e.start_date, e.end_date)}d)</span>
                      )}
                    </td>
                    <td>
                      {e.city || e.country ? (
                        <span className="inline-flex items-center gap-1 text-slate-600">
                          <MapPin size={13} className="text-slate-400" />
                          {[e.city, e.country].filter(Boolean).join(", ")}
                        </span>
                      ) : "—"}
                    </td>
                    <td><span className="text-[12.5px]">{e.event_type}</span></td>
                    <td>
                      <div className="flex gap-1 flex-wrap">
                        {chTags.slice(0, 2).map((c) => <Tag key={c!.id} color={c!.color}>{c!.name}</Tag>)}
                        {chTags.length > 2 && <Tag>+{chTags.length - 2}</Tag>}
                      </div>
                    </td>
                    <td className="text-right tabular-nums">{formatNumber(e.adults + e.children)}</td>
                    <td className="text-right tabular-nums">{formatNumber(e.views)}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/events/${e.id}`} className="btn btn-ghost btn-sm" title="View"><CalendarDays size={14} /></Link>
                        {canWrite && (
                          <>
                            <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => openEdit(e)}><Pencil size={14} /></button>
                            <button className="btn btn-ghost btn-sm" title="Duplicate" onClick={() => duplicate(e)}><Copy size={14} /></button>
                          </>
                        )}
                        {isAdmin && e.status !== "Archived" && (
                          <button className="btn btn-ghost btn-sm" title="Archive" onClick={() => archive(e)}><Archive size={14} /></button>
                        )}
                        {isAdmin && (
                          <button className="btn btn-ghost btn-sm hover:!text-red-600" title="Delete" onClick={() => remove(e)}><Trash2 size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* mobile cards */}
        <div className="md:hidden divide-y">
          {filtered.map((e) => (
            <Link key={e.id} href={`/events/${e.id}`} className="block p-4 hover:bg-slate-50">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-[14px]">{e.name}</p>
                <StatusBadge status={e.status} />
              </div>
              <p className="text-[12px] text-slate-500 mt-1">{dateRangeLabel(e.start_date, e.end_date)}</p>
              <p className="text-[12px] text-slate-500">{[e.city, e.country].filter(Boolean).join(", ")}</p>
              <div className="flex items-center gap-3 mt-2 text-[12px] text-slate-600">
                <span className="inline-flex items-center gap-1"><Users size={12} /> {formatNumber(e.adults + e.children)}</span>
                <span>{e.event_type}</span>
              </div>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <EmptyState
            icon={CalendarDays}
            title={q || Object.values(filters).some(Boolean) ? "No events match your filters" : "No events yet"}
            description={q || Object.values(filters).some(Boolean)
              ? "Try adjusting or clearing the filters."
              : canWrite ? "Create your first event to start tracking engagement." : "Events will appear here once they are created."}
            action={canWrite && !q && !Object.values(filters).some(Boolean) ? (
              <button onClick={openNew} className="btn btn-primary btn-sm"><Plus size={15} /> Create Event</button>
            ) : undefined}
          />
        )}
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Edit Event" : "New Event"} wide>
        <EventForm
          event={editing}
          partners={partners}
          channels={channels}
          profiles={profiles}
          eventTypes={eventTypes}
          onDone={() => { setFormOpen(false); router.refresh(); }}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>
    </div>
  );
}
