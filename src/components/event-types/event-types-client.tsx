"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { EventTypeRow } from "@/lib/types";
import { canWriteEvents, type UserRole } from "@/lib/types";
import { PageHeader, EmptyState, Tag } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { Tag as TagIcon, Plus, Pencil, Trash2, Loader2, Palette } from "lucide-react";

const COLOR_PALETTE = ["#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4", "#10b981", "#ec4899", "#64748b"];

export function EventTypesClient({ eventTypes, role }: { eventTypes: EventTypeRow[]; role: UserRole }) {
  const router = useRouter();
  const { toast } = useToast();
  const canWrite = canWriteEvents(role);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EventTypeRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", color: COLOR_PALETTE[0], sort_order: 0 });

  const sorted = useMemo(
    () => [...eventTypes].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name)),
    [eventTypes],
  );
  const activeCount = eventTypes.filter((t) => t.is_active).length;

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", color: COLOR_PALETTE[eventTypes.length % COLOR_PALETTE.length], sort_order: eventTypes.length + 1 });
    setError(null);
    setOpen(true);
  };

  const openEdit = (t: EventTypeRow) => {
    setEditing(t);
    setForm({ name: t.name, color: t.color, sort_order: t.sort_order });
    setError(null);
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) { setError("Name is required."); return; }
    setBusy(true);
    try {
      const sb = createClient();
      const payload = {
        name: form.name.trim(),
        slug: form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        color: form.color,
        sort_order: form.sort_order,
      };
      const { error } = editing
        ? await sb.from("event_types").update(payload).eq("id", editing.id)
        : await sb.from("event_types").insert(payload);
      if (error) {
        setError(error.message.includes("duplicate") ? "An event type with this name already exists." : error.message);
        return;
      }
      toast(editing ? "Event type updated" : "Event type added");
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (t: EventTypeRow) => {
    const { error } = await createClient().from("event_types").update({ is_active: !t.is_active }).eq("id", t.id);
    if (error) { toast(error.message, "error"); return; }
    toast(t.is_active ? `${t.name} hidden from pickers` : `${t.name} re-activated`);
    router.refresh();
  };

  const remove = async (t: EventTypeRow) => {
    if (!confirm(`Delete “${t.name}”? Existing events keep their type value.`)) return;
    setBusy(true);
    try {
      const { error } = await createClient().from("event_types").delete().eq("id", t.id);
      if (error) {
        toast(error.message.includes("foreign key") || error.message.includes("violates")
          ? "Cannot delete — events still reference this type. Hide it instead."
          : error.message, "error");
        return;
      }
      toast("Event type deleted");
      router.refresh();
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Event Types"
        description={`${activeCount} active of ${eventTypes.length} total — used in the event form, filters and analytics`}
        actions={canWrite && <button onClick={openNew} className="btn btn-primary btn-sm"><Plus size={15} /> Add Event Type</button>}
      />

      {sorted.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={TagIcon}
            title="No event types yet"
            description={canWrite ? "Add the types of engagement SAT-7 runs — School Outreach, Church Partnership, Festival…" : "Event types will appear here once added."}
            action={canWrite ? <button onClick={openNew} className="btn btn-primary btn-sm"><Plus size={15} /> Add Event Type</button> : undefined}
          />
        </div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))" }}>
          {sorted.map((t) => (
            <div key={t.id} className="card card-hover p-4" style={{ opacity: t.is_active ? 1 : 0.5 }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-xl grid place-items-center shrink-0" style={{ background: `${t.color}18`, color: t.color }}>
                    <TagIcon size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-[14px] truncate">{t.name}</p>
                    <p className="text-[11.5px] text-slate-500">Order {t.sort_order}</p>
                  </div>
                </div>
                {canWrite && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button className="btn btn-ghost btn-sm !p-1.5" title="Edit" onClick={() => openEdit(t)}><Pencil size={13} /></button>
                    <button
                      className="btn btn-ghost btn-sm !p-1.5" title={t.is_active ? "Hide from pickers" : "Re-activate"}
                      onClick={() => toggleActive(t)}
                    >
                      {t.is_active ? "👁" : "🚫"}
                    </button>
                    <button className="btn btn-ghost btn-sm !p-1.5 hover:!text-red-600" title="Delete" onClick={() => remove(t)}><Trash2 size={13} /></button>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <Tag color={t.color}>{t.name}</Tag>
                {!t.is_active && <span className="badge" style={{ background: "var(--surface-2)", color: "var(--muted)" }}>Hidden</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Edit ${editing.name}` : "Add Event Type"}>
        <form onSubmit={save} className="space-y-3" noValidate>
          <div>
            <label className="label" htmlFor="et-name">Name *</label>
            <input
              id="et-name" className="input" required autoFocus
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. School Outreach"
            />
          </div>
          <div>
            <label className="label"><Palette size={12} className="inline mr-1" /> Color</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c} type="button" aria-label={`Color ${c}`}
                  className="w-8 h-8 rounded-lg transition-transform hover:scale-110"
                  style={{ background: c, outline: form.color === c ? "3px solid var(--ink)" : "none", outlineOffset: 2 }}
                  onClick={() => setForm({ ...form, color: c })}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="et-order">Sort Order</label>
            <input
              id="et-order" className="input" type="number" min={0}
              value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
            />
          </div>
          {error && <p className="rounded-xl px-4 py-2.5 text-[13px]" style={{ background: "var(--red-soft)", color: "#b91c1c" }} role="alert">{error}</p>}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={busy}>
              {busy && <Loader2 size={15} className="animate-spin" />}
              {editing ? "Save Changes" : "Add Event Type"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
