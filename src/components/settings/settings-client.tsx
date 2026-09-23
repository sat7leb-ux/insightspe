"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SessionUser } from "@/lib/types";
import { USER_ROLES } from "@/lib/types";
import { PageHeader, Avatar } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { Settings, KeyRound, Loader2, ShieldCheck } from "lucide-react";

export function SettingsClient({ user }: { user: SessionUser }) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState(user.full_name);
  const [dept, setDept] = useState(user.dept);
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [savingPw, setSavingPw] = useState(false);

  const roleInfo = USER_ROLES.find((r) => r.value === user.role);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { error } = await createClient().from("profiles").update({ full_name: name, dept }).eq("id", user.id);
      if (error) throw error;
      toast("Profile updated");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to update profile", "error");
    } finally { setSavingProfile(false); }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.next !== pw.confirm) { toast("New passwords do not match.", "error"); return; }
    if (pw.next.length < 8 || !/[A-Z]/.test(pw.next) || !/[0-9]/.test(pw.next)) {
      toast("Password must be at least 8 characters with an uppercase letter and a number.", "error");
      return;
    }
    setSavingPw(true);
    try {
      const sb = createClient();
      const { error: authErr } = await sb.auth.signInWithPassword({ email: user.email, password: pw.current });
      if (authErr) { toast("Current password is incorrect.", "error"); return; }
      const { error } = await sb.auth.updateUser({ password: pw.next });
      if (error) throw error;
      await sb.from("profiles").update({ must_change_password: false }).eq("id", user.id);
      toast("Password changed successfully");
      setPw({ current: "", next: "", confirm: "" });
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to change password", "error");
    } finally { setSavingPw(false); }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader title="Settings" description="Your profile and account preferences." />

      <div className="card p-5">
        <div className="flex items-center gap-4 mb-5">
          <Avatar name={user.full_name} size={52} />
          <div>
            <p className="font-semibold text-[15px]">{user.full_name}</p>
            <p className="text-[13px] text-slate-500">{user.email}</p>
            <span className="badge mt-1" style={{ background: "var(--brand-soft)", color: "#1e40af" }}>{user.role.replace("_", " ")}</span>
          </div>
        </div>
        <form onSubmit={saveProfile} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="label" htmlFor="s-name">Full Name</label><input id="s-name" className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><label className="label" htmlFor="s-dept">Department</label><input id="s-dept" className="input" value={dept} onChange={(e) => setDept(e.target.value)} /></div>
          </div>
          <button className="btn btn-primary btn-sm" disabled={savingProfile}>
            {savingProfile && <Loader2 size={14} className="animate-spin" />} Save Profile
          </button>
        </form>
      </div>

      <div className="card p-5">
        <h3 className="flex items-center gap-2 font-semibold text-[14px] mb-4"><KeyRound size={16} /> Change Password</h3>
        {user.must_change_password && (
          <p className="rounded-xl px-4 py-2.5 text-[13px] mb-4" style={{ background: "var(--amber-soft)", color: "#b45309" }}>
            Your administrator has asked you to change your password. Please set a new one.
          </p>
        )}
        <form onSubmit={changePassword} className="space-y-3">
          <div><label className="label" htmlFor="pw-current">Current Password</label><input id="pw-current" type="password" className="input" required value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="label" htmlFor="pw-next">New Password</label><input id="pw-next" type="password" className="input" required value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></div>
            <div><label className="label" htmlFor="pw-confirm">Confirm New Password</label><input id="pw-confirm" type="password" className="input" required value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></div>
          </div>
          <button className="btn btn-primary btn-sm" disabled={savingPw}>
            {savingPw && <Loader2 size={14} className="animate-spin" />} Change Password
          </button>
        </form>
      </div>

      <div className="card p-5">
        <h3 className="flex items-center gap-2 font-semibold text-[14px] mb-3"><ShieldCheck size={16} /> Your Access</h3>
        <p className="text-[13px] text-slate-600">{roleInfo?.description}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="badge" style={{ background: user.can_view_financials ? "var(--green-soft)" : "var(--surface-2)", color: user.can_view_financials ? "#047857" : "var(--muted)" }}>
            Financial data: {user.can_view_financials ? "Visible" : "Hidden"}
          </span>
          <span className="badge" style={{ background: "var(--surface-2)", color: "var(--muted)" }}>
            Role: {roleInfo?.label}
          </span>
        </div>
      </div>
    </div>
  );
}
