import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SessionUser } from "@/lib/types";

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, dept, avatar_url, can_view_financials, must_change_password, is_active")
      .eq("id", user.id)
      .single();

    if (!profile) return null;
    if (!profile.is_active) return null; // disabled accounts cannot use the app

    return {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name || profile.email,
      role: profile.role,
      dept: profile.dept,
      avatar_url: profile.avatar_url,
      can_view_financials: profile.can_view_financials,
      must_change_password: profile.must_change_password,
      is_active: profile.is_active,
    };
  } catch {
    return null;
  }
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: string[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/dashboard?denied=1");
  return user;
}
