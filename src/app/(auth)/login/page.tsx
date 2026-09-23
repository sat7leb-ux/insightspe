"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const sb = createClient();
      const { error } = await sb.auth.signInWithPassword({
        email,
        password,
        options: remember ? undefined : undefined,
      });
      if (error) {
        setError(
          error.message === "Invalid login credentials"
            ? "Incorrect email or password."
            : error.message === "Email not confirmed"
              ? "Please confirm your email first — check your inbox."
              : error.message
        );
        return;
      }
      const next = params.get("next");
      router.push(next ?? "/dashboard");
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-[22px] font-bold tracking-tight">Welcome back</h1>
      <p className="text-[13px] text-slate-500 mt-1 mb-6">Sign in to the SAT-7 Insights Portal.</p>

      {params.get("reset") === "success" && (
        <div className="rounded-xl px-4 py-3 mb-4 text-[13px]" style={{ background: "var(--green-soft)", color: "#047857" }} role="status">
          Password updated. Sign in with your new password.
        </div>
      )}
      {params.get("signup") === "success" && (
        <div className="rounded-xl px-4 py-3 mb-4 text-[13px]" style={{ background: "var(--brand-soft)", color: "#1e40af" }} role="status">
          Account created. You can sign in now.
        </div>
      )}

      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input
            id="email" type="email" required autoComplete="email" autoFocus
            className="input" placeholder="you@sat7.org"
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="label">Password</label>
            <Link href="/forgot-password" className="text-[12px] font-medium text-blue-700 hover:underline">Forgot password?</Link>
          </div>
          <div className="relative">
            <input
              id="password" type={showPw ? "text" : "password"} required autoComplete="current-password"
              className="input pr-10" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <label className="flex items-center gap-2 text-[13px] text-slate-600 cursor-pointer select-none">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-blue-700" />
          Remember session
        </label>

        {error && (
          <p className="rounded-xl px-4 py-2.5 text-[13px]" style={{ background: "var(--red-soft)", color: "#b91c1c" }} role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <p className="text-[13px] text-slate-500 text-center mt-6">
        Need an account?{" "}
        <Link href="/signup" className="font-semibold text-blue-700 hover:underline">Sign Up</Link>
      </p>
    </>
  );
}
