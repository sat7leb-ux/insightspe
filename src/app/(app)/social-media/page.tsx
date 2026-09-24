import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { safe, getEvents, getChannels } from "@/lib/queries";
import { SocialMediaClient } from "@/components/social/social-media-client";
import type { SocialAccount, SocialPost } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SocialMediaPage() {
  const user = await requireUser();
  const sb = await createClient();

  const [accounts, posts, events, channels] = await Promise.all([
    safe(async () => {
      const { data } = await sb
        .from("social_accounts")
        .select("*, channels(id, name, color)")
        .eq("is_active", true)
        .order("platform")
        .order("display_name");
      return (data ?? []) as SocialAccount[];
    }, []),
    safe(async () => {
      const { data } = await sb
        .from("social_posts")
        .select("*, social_accounts(id, platform, handle, display_name, account_url, channel_id, channels(id, name, color)), events(id, name)")
        .order("posted_at", { ascending: false, nullsFirst: false })
        .limit(300);
      return (data ?? []) as SocialPost[];
    }, []),
    getEvents({}),
    getChannels(),
  ]);

  return (
    <SocialMediaClient
      accounts={accounts}
      posts={posts}
      events={events}
      channels={channels}
      role={user.role}
    />
  );
}
