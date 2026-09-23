"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pwValid = password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!pwValid) {
      setError("Password must be at least 8 characters with an uppercase letter and a number.");
      return;
    }
    setLoading(true);
    try {
      const sb = createClient();
      const { error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) {
        setError(error.message.includes("already") ? "An account with this email already exists." : error.message);
        return;
      }
      window.location.href = "/login?signup=success";
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-[22px] font-bold tracking-tight">Create your account</h1>
      <p className="text-[13px] text-slate-500 mt-1 mb-6">
        New accounts start as Contributors. An administrator can grant additional roles.
      </p>

      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="name" className="label">Full name</label>
          <input id="name" className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
        </div>
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@sat7.org" />
        </div>
        <div>
          <label htmlFor="password" className="label">Password</label>
          <input id="password" type="password" className="input" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 chars, 1 uppercase, 1 number" />
          {password.length > 0 && !pwValid && (
            <p className="text-[12px] text-amber-700 mt-1.5">Use at least 8 characters with an uppercase letter and a number.</p>
          )}
        </div>

        {error && (
          <p className="rounded-xl px-4 py-2.5 text-[13px]" style={{ background: "var(--red-soft)", color: "#b91c1c" }} role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "Creating account…" : "Sign Up"}
        </button>
      </form>

      <p className="text-[13px] text-slate-500 text-center mt-6">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-blue-700 hover:underline">Sign In</Link>
      </p>
    </>
  );
}
