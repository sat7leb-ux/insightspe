import { requireUser } from "@/lib/auth";
import {
  getEvents, getAllGoals, getAllDailyReports, getAllMaterials, getAllPartnerships, getChannels, safe,
} from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { PublicEngagementClient } from "@/components/public-engagement/public-engagement-client";
import { canViewFinancials } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PublicEngagementPage() {
  const user = await requireUser();
  const sb = createClient();

  const [events, goals, dailyReports, materials, partnerships, channels, contactsCount, followsCount] = await Promise.all([
    getEvents({}),
    getAllGoals(),
    getAllDailyReports(),
    getAllMaterials(),
    getAllPartnerships(),
    getChannels(),
    safe(async () => {
      const { count } = await sb.from("event_contacts").select("id", { count: "exact", head: true });
      return count ?? 0;
    }, 0),
    safe(async () => {
      const { data } = await sb.from("event_social_follows").select("follows_gained");
      return (data ?? []).reduce((s, f) => s + f.follows_gained, 0);
    }, 0),
  ]);

  return (
    <PublicEngagementClient
      events={events}
      goals={goals}
      dailyReports={dailyReports}
      materials={materials}
      partnerships={partnerships}
      contactsCount={contactsCount}
      followsCount={followsCount}
      channels={channels}
      canViewFinancials={canViewFinancials(user.role, user.can_view_financials)}
    />
  );
}
