import { requireUser } from "@/lib/auth";
import {
  getEvents, getAllGoals, getAllDailyReports, getChannels, getEventContacts,
  getAllPartnerships, getAllMaterials,
} from "@/lib/queries";
import { safe } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { canViewFinancials } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const sb = createClient();

  const [events, goals, dailyReports, channels, partnerships, materials, contactsCount] = await Promise.all([
    getEvents({}),
    getAllGoals(),
    getAllDailyReports(),
    getChannels(),
    getAllPartnerships(),
    getAllMaterials(),
    safe(async () => {
      const { count } = await sb.from("event_contacts").select("id", { count: "exact", head: true });
      return count ?? 0;
    }, 0),
  ]);

  return (
    <DashboardClient
      events={events}
      goals={goals}
      dailyReports={dailyReports}
      contactsCount={contactsCount}
      partnershipsCount={partnerships.length}
      materialsCount={materials.reduce((s, m) => s + Number(m.quantity), 0)}
      channels={channels}
      canViewFinancials={canViewFinancials(user.role, user.can_view_financials)}
    />
  );
}
