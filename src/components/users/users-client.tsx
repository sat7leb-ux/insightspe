"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { USER_ROLES, type UserRole } from "@/lib/types";
import { PageHeader, Avatar, StatusBadge, EmptyState } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { formatDateTime, downloadCsv } from "@/lib/utils";
import { Users, Plus, Pencil, Search, Download, ShieldCheck, ShieldOff, Trash2, KeyRound, Loader2 } from "lucide-react";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export function UsersClient({ profiles: initial, currentUserId, currentRole }: {
  profiles: Profile[]; currentUserId: string; currentRole: UserRole;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [edit, setEdit] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    let list = initial;
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      list = list.filter((p) => p.full_name.toLowerCase().includes(t) || p.email.toLowerCase().includes(t) || p.dept.toLowerCase().includes(t));
    }
    if (roleFilter) list = list.filter((p) => p.role === roleFilter);
    if (statusFilter) list = list.filter((p) => (statusFilter === "active" ? p.is_active : !p.is_active));
    return list;
  }, [initial, q, roleFilter, statusFilter]);

  const callEdge = async (method: "POST" | "PATCH" | "DELETE", body?: unknown, qs = "") => {
    const sb = createClient();
    const { data: { session } } = await sb.auth.getSession();
    if (!session) throw new Error("Session expired — please sign in again.");
    const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-users${qs}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
    return json;
  };

  const toggleActive = async (p: Profile) => {
    setBusy(true);
    try {
      await callEdge("PATCH", { id: p.id, is_active: !p.is_active });
      toast(p.is_active ? `${p.full_name} disabled` : `${p.full_name} enabled`);
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed", "error");
    } finally { setBusy(false); }
  };

  const remove = async (p: Profile) => {
    if (!confirm(`Delete ${p.full_name} permanently? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await callEdge("DELETE", undefined, `?id=${p.id}`);
      toast("User deleted");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed", "error");
    } finally { setBusy(false); }
  };

  const resetPassword = async (p: Profile) => {
    const pw = prompt(`Set a new temporary password for ${p.full_name} (min 8 chars, 1 uppercase, 1 number):`);
    if (!pw) return;
    setBusy(true);
    try {
      await callEdge("PATCH", { id: p.id, password: pw });
      toast(`Password reset for ${p.full_name}. They should change it at next login.`);
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed", "error");
    } finally { setBusy(false); }
  };

  const exportCsv = () => {
    downloadCsv("users.csv", filtered.map((p) => ({
      Name: p.full_name, Email: p.email, Role: p.role, Department: p.dept,
      Active: p.is_active ? "Yes" : "No", Financials: p.can_view_financials ? "Yes" : "No",
      LastActive: p.last_active_at ?? "", Created: p.created_at,
    })));
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="User Management"
        description={`${initial.length} user${initial.length === 1 ? "" : "s"} · ${initial.filter((p) => p.is_active).length} active`}
        actions={
          <>
            <button onClick={exportCsv} className="btn btn-secondary btn-sm"><Download size={14} /> Export</button>
            <button onClick={() => setAddOpen(true)} className="btn btn-primary btn-sm"><Plus size={15} /> Add User</button>
          </>
        }
      />

      {/* filters */}
      <div className="card p-3 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search users…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search users" />
        </div>
        <select className="select" style={{ width: "auto" }} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Filter by role">
          <option value="">All Roles</option>
          {USER_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select className="select" style={{ width: "auto" }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="hidden md:block table-wrap">
          <table className="data">
            <thead><tr><th>User</th><th>Role</th><th>Department</th><th>Financials</th><th>Status</th><th>Last Active</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} style={{ opacity: p.is_active ? 1 : 0.55 }}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={p.full_name} size={30} />
                      <div>
                        <p className="font-semibold text-[13.5px]">{p.full_name}{p.id === currentUserId && <span className="text-[11px] text-blue-700 font-medium"> (you)</span>}</p>
                        <p className="text-[11.5px] text-slate-500">{p.email}</p>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge" style={{ background: "var(--brand-soft)", color: "#1e40af" }}>{p.role.replace("_", " ")}</span></td>
                  <td>{p.dept || "—"}</td>
                  <td>{p.can_view_financials ? <StatusBadge status="Yes" /> : <span className="text-slate-400">No</span>}</td>
                  <td><StatusBadge status={p.is_active ? "Active" : "Disabled"} /></td>
                  <td className="text-[12px] text-slate-500">{p.last_active_at ? formatDateTime(p.last_active_at) : "—"}</td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => setEdit(p)}><Pencil size={14} /></button>
                      <button className="btn btn-ghost btn-sm" title="Reset password" onClick={() => resetPassword(p)}><KeyRound size={14} /></button>
                      {p.id !== currentUserId && (
                        <>
                          <button className="btn btn-ghost btn-sm" title={p.is_active ? "Disable" : "Enable"} onClick={() => toggleActive(p)}>
                            {p.is_active ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                          </button>
                          <button className="btn btn-ghost btn-sm hover:!text-red-600" title="Delete" onClick={() => remove(p)}><Trash2 size={14} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* mobile cards */}
        <div className="md:hidden divide-y">
          {filtered.map((p) => (
            <div key={p.id} className="p-4" style={{ opacity: p.is_active ? 1 : 0.55 }}>
              <div className="flex items-center gap-3">
                <Avatar name={p.full_name} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[14px] truncate">{p.full_name}</p>
                  <p className="text-[12px] text-slate-500 truncate">{p.email}</p>
                </div>
                <StatusBadge status={p.is_active ? "Active" : "Disabled"} />
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="badge" style={{ background: "var(--brand-soft)", color: "#1e40af" }}>{p.role.replace("_", " ")}</span>
                {p.dept && <span className="badge" style={{ background: "var(--surface-2)", color: "var(--muted)" }}>{p.dept}</span>}
              </div>
              <div className="flex gap-2 mt-3">
                <button className="btn btn-secondary btn-sm flex-1" onClick={() => setEdit(p)}><Pencil size={13} /> Edit</button>
                <button className="btn btn-secondary btn-sm" onClick={() => resetPassword(p)}><KeyRound size={13} /></button>
                {p.id !== currentUserId && (
                  <button className="btn btn-secondary btn-sm" onClick={() => toggleActive(p)}>
                    {p.is_active ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && <EmptyState icon={Users} title="No users found" description="Try a different search or filter." />}
      </div>

      <AddUserModal open={addOpen} onClose={() => setAddOpen(false)} callEdge={callEdge} onDone={() => { setAddOpen(false); router.refresh(); }} />
      <EditUserModal user={edit} onClose={() => setEdit(null)} callEdge={callEdge} currentRole={currentRole} currentUserId={currentUserId} onDone={() => { setEdit(null); router.refresh(); }} />
    </div>
  );
}

type EdgeFn = (method: "POST" | "PATCH" | "DELETE", body?: unknown, qs?: string) => Promise<unknown>;

function AddUserModal({ open, onClose, callEdge, onDone }: { open: boolean; onClose: () => void; callEdge: EdgeFn; onDone: () => void }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "contributor", dept: "", phone: "", can_view_financials: false });

  const pwValid = form.password.length >= 8 && /[A-Z]/.test(form.password) && /[0-9]/.test(form.password);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!pwValid) { setError("Password must be at least 8 characters with an uppercase letter and a number."); return; }
    setBusy(true);
    try {
      await callEdge("POST", form);
      toast(`User ${form.email} added successfully`);
      setForm({ full_name: "", email: "", password: "", role: "contributor", dept: "", phone: "", can_view_financials: false });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add user");
    } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add User">
      <form onSubmit={submit} className="space-y-3" noValidate>
        <div><label className="label">Full Name *</label><input className="input" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
        <div><label className="label">Email *</label><input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div>
          <label className="label">Temporary Password *</label>
          <input className="input" type="text" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min. 8 chars, 1 uppercase, 1 number" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Role</label>
            <select className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {USER_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div><label className="label">Department</label><input className="input" value={form.dept} onChange={(e) => setForm({ ...form, dept: e.target.value })} /></div>
        </div>
        <label className="flex items-center gap-2 text-[13px] cursor-pointer">
          <input type="checkbox" checked={form.can_view_financials} onChange={(e) => setForm({ ...form, can_view_financials: e.target.checked })} className="accent-blue-700" />
          Can view financial information (budget/cost)
        </label>
        {error && <p className="rounded-xl px-4 py-2.5 text-[13px]" style={{ background: "var(--red-soft)", color: "#b91c1c" }} role="alert">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy && <Loader2 size={15} className="animate-spin" />} Add User</button>
        </div>
      </form>
    </Modal>
  );
}

function EditUserModal({ user, onClose, callEdge, currentRole, currentUserId, onDone }: {
  user: Profile | null; onClose: () => void; callEdge: EdgeFn; currentRole: UserRole; currentUserId: string; onDone: () => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ full_name: "", role: "contributor", dept: "", phone: "", can_view_financials: false });

  // sync form when user changes
  useMemo(() => {
    if (user) setForm({ full_name: user.full_name, role: user.role, dept: user.dept, phone: user.phone, can_view_financials: user.can_view_financials });
  }, [user]);

  if (!user) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await callEdge("PATCH", { id: user.id, ...form });
      toast("User updated successfully");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally { setBusy(false); }
  };

  return (
    <Modal open={!!user} onClose={onClose} title={`Edit ${user.full_name}`}>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <div><label className="label">Full Name</label><input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
        <div>
          <label className="label">Role</label>
          <select className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {USER_ROLES.filter((r) => currentRole === "super_admin" || r.value !== "super_admin").map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          {user.id === currentUserId && <p className="text-[11.5px] text-amber-700 mt-1">You are editing your own account.</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Department</label><input className="input" value={form.dept} onChange={(e) => setForm({ ...form, dept: e.target.value })} /></div>
          <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        </div>
        <label className="flex items-center gap-2 text-[13px] cursor-pointer">
          <input type="checkbox" checked={form.can_view_financials} onChange={(e) => setForm({ ...form, can_view_financials: e.target.checked })} className="accent-blue-700" />
          Can view financial information (budget/cost)
        </label>
        {error && <p className="rounded-xl px-4 py-2.5 text-[13px]" style={{ background: "var(--red-soft)", color: "#b91c1c" }} role="alert">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy && <Loader2 size={15} className="animate-spin" />} Save Changes</button>
        </div>
      </form>
    </Modal>
  );
}
