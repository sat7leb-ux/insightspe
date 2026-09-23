import { requireUser } from "@/lib/auth";
import { getEvents, getAllGoals, getChannels, getPartners, getProfiles } from "@/lib/queries";
import { AnalyticsClient } from "@/components/analytics/analytics-client";
import { canViewFinancials } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const user = await requireUser();
  const [events, goals, channels, partners, profiles] = await Promise.all([
    getEvents({}),
    getAllGoals(),
    getChannels(),
    getPartners(),
    getProfiles(),
  ]);

  return (
    <AnalyticsClient
      events={events}
      goals={goals}
      channels={channels}
      partners={partners}
      profiles={profiles}
      canViewFinancials={canViewFinancials(user.role, user.can_view_financials)}
    />
  );
}
