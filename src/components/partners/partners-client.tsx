"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Partner } from "@/lib/types";
import { PARTNER_TYPES, canWriteEvents, type UserRole } from "@/lib/types";
import { PageHeader, EmptyState, Tag, Avatar } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { formatDate, downloadCsv } from "@/lib/utils";
import { Building2, Plus, Pencil, Search, Download, Trash2, Loader2, MapPin, Mail, Phone } from "lucide-react";

export function PartnersClient({ partners: initial, role }: { partners: Partner[]; role: UserRole }) {
  const router = useRouter();
  const { toast } = useToast();
  const canWrite = canWriteEvents(role);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", partner_type: "Church", country: "", city: "",
    contact_person: "", contact_email: "", contact_phone: "", notes: "",
  });

  const countries = useMemo(() => [...new Set(initial.map((p) => p.country).filter(Boolean))].sort(), [initial]);

  const filtered = useMemo(() => {
    let list = initial;
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(t) || p.city.toLowerCase().includes(t) ||
        p.country.toLowerCase().includes(t) || p.contact_person.toLowerCase().includes(t) ||
        p.contact_email.toLowerCase().includes(t));
    }
    if (typeFilter) list = list.filter((p) => p.partner_type === typeFilter);
    if (countryFilter) list = list.filter((p) => p.country === countryFilter);
    return list;
  }, [initial, q, typeFilter, countryFilter]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", partner_type: "Church", country: "", city: "", contact_person: "", contact_email: "", contact_phone: "", notes: "" });
    setError(null);
    setOpen(true);
  };

  const openEdit = (p: Partner) => {
    setEditing(p);
    setForm({
      name: p.name, partner_type: p.partner_type, country: p.country, city: p.city,
      contact_person: p.contact_person, contact_email: p.contact_email,
      contact_phone: p.contact_phone, notes: p.notes,
    });
    setError(null);
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) { setError("Partner name is required."); return; }
    setBusy(true);
    try {
      const sb = createClient();
      if (editing) {
        const { error } = await sb.from("partners").update(form).eq("id", editing.id);
        if (error) throw error;
        toast("Partner updated");
      } else {
        const { error } = await sb.from("partners").insert(form);
        if (error) throw error;
        toast("Partner added");
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save partner";
      setError(msg.includes("row-level security") ? "Permission denied — your role cannot manage partners." : msg);
    } finally { setBusy(false); }
  };

  const remove = async (p: Partner) => {
    if (!confirm(`Delete “${p.name}”? Events referencing it will keep their data but lose the partner link.`)) return;
    setBusy(true);
    try {
      const sb = createClient();
      const { error } = await sb.from("partners").update({ is_deleted: true }).eq("id", p.id);
      if (error) throw error;
      toast("Partner deleted");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not delete partner", "error");
    } finally { setBusy(false); }
  };

  const exportCsv = () => {
    downloadCsv("partners.csv", filtered.map((p) => ({
      Name: p.name, Type: p.partner_type, Country: p.country, City: p.city,
      Contact: p.contact_person, Email: p.contact_email, Phone: p.contact_phone, Notes: p.notes,
    })));
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Partners / Hosts"
        description={`${initial.length} organization${initial.length === 1 ? "" : "s"} — churches, dioceses, schools, NGOs`}
        actions={
          <>
            <button onClick={exportCsv} className="btn btn-secondary btn-sm"><Download size={14} /> Export</button>
            {canWrite && <button onClick={openNew} className="btn btn-primary btn-sm"><Plus size={15} /> Add Partner</button>}
          </>
        }
      />

      <div className="card p-3 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search partners…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search partners" />
        </div>
        <select className="select" style={{ width: "auto" }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filter by type">
          <option value="">All Types</option>
          {PARTNER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="select" style={{ width: "auto" }} value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} aria-label="Filter by country">
          <option value="">All Countries</option>
          {countries.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Building2}
            title={q || typeFilter || countryFilter ? "No partners match your filters" : "No partners yet"}
            description={canWrite ? "Add the churches, schools and organizations you work with — they can then be linked to events." : "Partners will appear here once added."}
            action={canWrite && !q && !typeFilter && !countryFilter ? (
              <button onClick={openNew} className="btn btn-primary btn-sm"><Plus size={15} /> Add Partner</button>
            ) : undefined}
          />
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 330px), 1fr))" }}>
          {filtered.map((p) => (
            <div key={p.id} className="card card-hover p-5 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={p.name} size={38} />
                  <div className="min-w-0">
                    <p className="font-semibold text-[14px] truncate">{p.name}</p>
                    <Tag>{p.partner_type}</Tag>
                  </div>
                </div>
                {canWrite && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => openEdit(p)}><Pencil size={14} /></button>
                    <button className="btn btn-ghost btn-sm hover:!text-red-600" title="Delete" onClick={() => remove(p)}><Trash2 size={14} /></button>
                  </div>
                )}
              </div>

              {(p.city || p.country) && (
                <p className="flex items-center gap-1.5 text-[12.5px] text-slate-500 mt-3">
                  <MapPin size={13} className="text-slate-400" />{[p.city, p.country].filter(Boolean).join(", ")}
                </p>
              )}
              {p.contact_person && (
                <p className="text-[12.5px] text-slate-600 mt-1.5 font-medium">{p.contact_person}</p>
              )}
              <div className="space-y-1 mt-1">
                {p.contact_email && (
                  <p className="flex items-center gap-1.5 text-[12px] text-slate-500 truncate">
                    <Mail size={12} className="text-slate-400 shrink-0" />{p.contact_email}
                  </p>
                )}
                {p.contact_phone && (
                  <p className="flex items-center gap-1.5 text-[12px] text-slate-500">
                    <Phone size={12} className="text-slate-400 shrink-0" />{p.contact_phone}
                  </p>
                )}
              </div>
              {p.notes && <p className="text-[12px] text-slate-500 mt-2 line-clamp-2">{p.notes}</p>}

              <div className="mt-3 pt-3 border-t flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Added {formatDate(p.created_at)}</span>
                <Link href={`/events?partner=${p.id}`} className="text-[12px] font-medium text-blue-700 hover:underline">
                  View events →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Edit ${editing.name}` : "Add Partner / Host"}>
        <form onSubmit={save} className="space-y-3" noValidate>
          <div>
            <label className="label" htmlFor="p-name">Organization Name *</label>
            <input id="p-name" className="input" required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. KKBC Church" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="p-type">Type</label>
              <select id="p-type" className="select" value={form.partner_type} onChange={(e) => setForm({ ...form, partner_type: e.target.value })}>
                {PARTNER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="p-country">Country</label>
              <input id="p-country" className="input" list="partner-countries" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Lebanon" />
              <datalist id="partner-countries">{countries.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <div>
              <label className="label" htmlFor="p-city">City</label>
              <input id="p-city" className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Beirut" />
            </div>
            <div>
              <label className="label" htmlFor="p-contact">Contact Person</label>
              <input id="p-contact" className="input" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} placeholder="Pastor Sami Khoury" />
            </div>
            <div>
              <label className="label" htmlFor="p-email">Contact Email</label>
              <input id="p-email" type="email" className="input" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="p-phone">Contact Phone</label>
              <input id="p-phone" className="input" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} placeholder="+961 …" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="p-notes">Notes</label>
            <textarea id="p-notes" className="textarea" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Partnership history, preferences…" />
          </div>
          {error && <p className="rounded-xl px-4 py-2.5 text-[13px]" style={{ background: "var(--red-soft)", color: "#b91c1c" }} role="alert">{error}</p>}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={busy}>
              {busy && <Loader2 size={15} className="animate-spin" />}
              {editing ? "Save Changes" : "Add Partner"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
