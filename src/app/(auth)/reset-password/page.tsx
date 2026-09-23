"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pwValid = password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!pwValid) { setError("Password must be at least 8 characters with an uppercase letter and a number."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const { error } = await createClient().auth.updateUser({ password });
      if (error) { setError(error.message); return; }
      // clear must_change_password flag
      await createClient().from("profiles").update({ must_change_password: false }).eq("id", (await createClient().auth.getUser()).data.user?.id ?? "");
      router.push("/login?reset=success");
    } catch {
      setError("Could not update password — is the reset link still valid?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-[22px] font-bold tracking-tight">Set a new password</h1>
      <p className="text-[13px] text-slate-500 mt-1 mb-6">Choose a strong password for your account.</p>

      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="password" className="label">New password</label>
          <input id="password" type="password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 chars, 1 uppercase, 1 number" />
        </div>
        <div>
          <label htmlFor="confirm" className="label">Confirm password</label>
          <input id="confirm" type="password" required className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {error && (
          <p className="rounded-xl px-4 py-2.5 text-[13px]" style={{ background: "var(--red-soft)", color: "#b91c1c" }} role="alert">{error}</p>
        )}
        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>

      <p className="text-[13px] text-slate-500 text-center mt-6">
        <Link href="/login" className="font-semibold text-blue-700 hover:underline">Back to sign in</Link>
      </p>
    </>
  );
}
