"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SocialAccount, Channel } from "@/lib/types";
import { PLATFORM_NAMES, canWriteEvents, type UserRole } from "@/lib/types";
import { Tag } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { formatNumber } from "@/lib/utils";
import { Share2, Plus, Pencil, Trash2, Loader2, ExternalLink } from "lucide-react";

export function SocialAccountsRegistry({
  accounts, channels, role,
}: {
  accounts: SocialAccount[];
  channels: Channel[];
  role: UserRole;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const canWrite = canWriteEvents(role);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SocialAccount | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    platform: "Facebook", handle: "", display_name: "", account_url: "",
    channel_id: "", followers: "0", notes: "",
  });

  const openNew = () => {
    setEditing(null);
    setForm({ platform: "Facebook", handle: "", display_name: "", account_url: "", channel_id: "", followers: "0", notes: "" });
    setError(null);
    setOpen(true);
  };

  const openEdit = (a: SocialAccount) => {
    setEditing(a);
    setForm({
      platform: a.platform, handle: a.handle, display_name: a.display_name,
      account_url: a.account_url, channel_id: a.channel_id ?? "",
      followers: String(a.followers), notes: a.notes,
    });
    setError(null);
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.display_name.trim()) { setError("Display name is required."); return; }
    setBusy(true);
    try {
      const sb = createClient();
      const payload = {
        platform: form.platform,
        handle: form.handle.trim() || `@${form.display_name.trim().toLowerCase().replace(/\s+/g, "")}`,
        display_name: form.display_name.trim(),
        account_url: form.account_url,
        channel_id: form.channel_id || null,
        followers: Number(form.followers || 0),
        notes: form.notes,
      };
      const { error } = editing
        ? await sb.from("social_accounts").update(payload).eq("id", editing.id)
        : await sb.from("social_accounts").insert(payload);
      if (error) throw error;
      toast(editing ? "Account updated" : "Account added");
      setOpen(false);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save account";
      setError(msg.includes("duplicate key") ? "This platform + handle combination already exists." : msg);
    } finally { setBusy(false); }
  };

  const remove = async (a: SocialAccount) => {
    if (!confirm(`Delete ${a.display_name}? Posts linked to it will also be removed.`)) return;
    setBusy(true);
    try {
      const { error } = await createClient().from("social_accounts").delete().eq("id", a.id);
      if (error) throw error;
      toast("Account deleted");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete", "error");
    } finally { setBusy(false); }
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-[14px]"><Share2 size={16} /> Social Media Accounts</h3>
          <p className="text-[12.5px] text-slate-500 mt-0.5">
            The registry of SAT-7 social accounts. These can be linked to events from each event&apos;s Social Media tab.
          </p>
        </div>
        {canWrite && (
          <button className="btn btn-primary btn-sm" onClick={openNew}><Plus size={14} /> Add Account</button>
        )}
      </div>

      {accounts.length === 0 ? (
        <p className="text-[13px] text-slate-400">No social accounts yet. Add the SAT-7 Facebook pages, Instagram profiles, YouTube channels and TikTok accounts.</p>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 250px), 1fr))" }}>
          {accounts.map((a) => (
            <div key={a.id} className="rounded-xl border p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-[13px] truncate">{a.display_name}</p>
                  <p className="text-[11.5px] text-slate-500 truncate">{a.platform} · {a.handle}</p>
                </div>
                {canWrite && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button className="btn btn-ghost btn-sm !p-1" title="Edit" onClick={() => openEdit(a)}><Pencil size={12} /></button>
                    <button className="btn btn-ghost btn-sm !p-1 hover:!text-red-600" title="Delete" onClick={() => remove(a)}><Trash2 size={12} /></button>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[11.5px] text-slate-500">{formatNumber(a.followers)} followers</span>
                {a.channels && <Tag color={a.channels.color}>{a.channels.name}</Tag>}
              </div>
              {a.account_url && (
                <a href={a.account_url} target="_blank" rel="noopener noreferrer" className="text-[11.5px] font-medium text-blue-700 hover:underline inline-flex items-center gap-1 mt-1">
                  <ExternalLink size={10} /> Profile
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Edit ${editing.display_name}` : "Add Social Account"}>
        <form onSubmit={save} className="space-y-3" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="sa-platform">Platform *</label>
              <select id="sa-platform" className="select" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                {PLATFORM_NAMES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="sa-channel">SAT-7 Channel</label>
              <select id="sa-channel" className="select" value={form.channel_id} onChange={(e) => setForm({ ...form, channel_id: e.target.value })}>
                <option value="">— None —</option>
                {channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="sa-name">Display Name *</label>
            <input id="sa-name" className="input" required value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="SAT-7 KIDS" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="sa-handle">Handle</label>
              <input id="sa-handle" className="input" value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} placeholder="@SAT7Kids" />
            </div>
            <div>
              <label className="label" htmlFor="sa-followers">Followers</label>
              <input id="sa-followers" className="input" type="number" min={0} value={form.followers} onChange={(e) => setForm({ ...form, followers: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="sa-url">Account URL</label>
            <input id="sa-url" className="input" type="url" value={form.account_url} onChange={(e) => setForm({ ...form, account_url: e.target.value })} placeholder="https://facebook.com/SAT7Kids" />
          </div>
          <div>
            <label className="label" htmlFor="sa-notes">Notes</label>
            <input id="sa-notes" className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          {error && <p className="rounded-xl px-4 py-2.5 text-[13px]" style={{ background: "var(--red-soft)", color: "#b91c1c" }} role="alert">{error}</p>}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={busy}>
              {busy && <Loader2 size={15} className="animate-spin" />}
              {editing ? "Save Changes" : "Add Account"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
