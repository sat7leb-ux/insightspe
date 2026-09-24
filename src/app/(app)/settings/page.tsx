import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { safe, getChannels } from "@/lib/queries";
import { SettingsClient } from "@/components/settings/settings-client";
import { SocialAccountsRegistry } from "@/components/settings/social-accounts-registry";
import type { SocialAccount } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const sb = await createClient();

  const [channels, accounts] = await Promise.all([
    getChannels(),
    safe(async () => {
      const { data } = await sb
        .from("social_accounts")
        .select("*, channels(id, name, color)")
        .order("platform")
        .order("display_name");
      return (data ?? []) as SocialAccount[];
    }, []),
  ]);

  return (
    <div className="space-y-5">
      <SettingsClient user={user} />
      <SocialAccountsRegistry accounts={accounts} channels={channels} role={user.role} />
    </div>
  );
}
