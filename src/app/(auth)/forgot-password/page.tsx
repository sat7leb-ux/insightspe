"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Loader2, MailCheck } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await createClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) { setError(error.message); return; }
      setSent(true);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl grid place-items-center mx-auto mb-4" style={{ background: "var(--green-soft)", color: "#047857" }}>
          <MailCheck size={22} />
        </div>
        <h1 className="text-[20px] font-bold">Check your inbox</h1>
        <p className="text-[13px] text-slate-500 mt-2 leading-relaxed">
          If an account exists for <strong>{email}</strong>, you will receive a password reset link shortly.
        </p>
        <Link href="/login" className="btn btn-secondary w-full mt-6">Back to sign in</Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-[22px] font-bold tracking-tight">Reset your password</h1>
      <p className="text-[13px] text-slate-500 mt-1 mb-6">Enter your email and we will send you a reset link.</p>

      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@sat7.org" />
        </div>
        {error && (
          <p className="rounded-xl px-4 py-2.5 text-[13px]" style={{ background: "var(--red-soft)", color: "#b91c1c" }} role="alert">{error}</p>
        )}
        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="text-[13px] text-slate-500 text-center mt-6">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-blue-700 hover:underline">Sign In</Link>
      </p>
    </>
  );
}
