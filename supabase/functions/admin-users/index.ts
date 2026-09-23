// Supabase Edge Function: admin-users
// Admin-only user management (create/update/delete auth users).
// The caller must be authenticated AND have admin role in profiles.
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, PATCH, DELETE, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "Missing authorization" }, 401);
  }

  // Caller client (RLS applies)
  const caller = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );

  // Verify caller is admin
  const { data: { user }, error: userErr } = await caller.auth.getUser();
  if (userErr || !user) return json({ error: "Invalid session" }, 401);

  const { data: profile, error: profErr } = await caller
    .from("profiles").select("role, is_active").eq("id", user.id).single();
  if (profErr || !profile) return json({ error: "Profile not found" }, 403);
  if (!["super_admin", "admin"].includes(profile.role)) {
    return json({ error: "Permission denied" }, 403);
  }
  if (!profile.is_active) return json({ error: "Account disabled" }, 403);

  // Admin client (service role)
  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  try {
    if (req.method === "POST") {
      const body = await req.json();
      const { email, password, full_name, role, dept, phone, can_view_financials } = body;
      if (!email || !password || password.length < 8) {
        return json({ error: "Email and a password of at least 8 characters are required" }, 400);
      }
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: full_name ?? email.split("@")[0] },
      });
      if (createErr) return json({ error: createErr.message }, 400);
      const uid = created.user.id;
      await admin.from("profiles").upsert({
        id: uid,
        email,
        full_name: full_name ?? email.split("@")[0],
        role: role ?? "contributor",
        dept: dept ?? "",
        phone: phone ?? "",
        can_view_financials: !!can_view_financials,
      });
      return json({ id: uid, email });
    }

    if (req.method === "PATCH") {
      const body = await req.json();
      const { id, password, ...profileFields } = body;
      if (!id) return json({ error: "User id required" }, 400);

      // Prevent self-demotion of the last super admin (simple guard)
      if (profileFields.role && id === user.id && profileFields.role !== "super_admin" && profile.role === "super_admin") {
        const { count } = await admin.from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "super_admin").eq("is_active", true);
        if ((count ?? 0) <= 1) return json({ error: "Cannot demote the last active super admin" }, 400);
      }

      if (Object.keys(profileFields).length > 0) {
        const { error: upErr } = await admin.from("profiles").update(profileFields).eq("id", id);
        if (upErr) return json({ error: upErr.message }, 400);
      }
      if (password) {
        if (password.length < 8) return json({ error: "Password must be at least 8 characters" }, 400);
        const { error: pwErr } = await admin.auth.admin.updateUserById(id, {
          password,
          // force re-login with new credentials
        });
        if (pwErr) return json({ error: pwErr.message }, 400);
        await admin.from("profiles").update({ must_change_password: true }).eq("id", id);
      }
      return json({ ok: true });
    }

    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const id = url.searchParams.get("id");
      if (!id) return json({ error: "User id required" }, 400);
      if (id === user.id) return json({ error: "You cannot delete your own account" }, 400);
      const { error: delErr } = await admin.auth.admin.deleteUser(id);
      if (delErr) return json({ error: delErr.message }, 400);
      // profiles row removed by ON DELETE CASCADE
      return json({ ok: true });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
