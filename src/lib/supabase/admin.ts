import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side admin client using the service role key.
 * Falls back to the RLS cookie client when the secret is absent so that
 * deploys without the secret never white-screen.
 */
export async function createAdminClient(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured");
  }

  if (serviceKey) {
    return createSupabaseClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  // No service key: fall back to the RLS cookie client so deploys without the
  // secret never white-screen. (RLS still applies.)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient: createCookieClient } = require("./server") as typeof import("./server");
  return (await createCookieClient()) as unknown as SupabaseClient;
}
