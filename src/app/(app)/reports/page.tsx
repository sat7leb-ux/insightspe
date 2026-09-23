import { requireUser } from "@/lib/auth";
import { getEvents, getAllDailyReports, getAllMaterials, getAllPartnerships } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { safe } from "@/lib/queries";
import { ReportsClient } from "@/components/reports/reports-client";
import { canViewFinancials } from "@/lib/types";
import type { EventSurvey } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await requireUser();
  const sb = await createClient();
  const [events, dailyReports, materials, partnerships, surveys] = await Promise.all([
    getEvents({}),
    getAllDailyReports(),
    getAllMaterials(),
    getAllPartnerships(),
    safe(async () => {
      const { data } = await sb.from("event_surveys").select("*, events(id, name)").order("submitted_at", { ascending: false }).limit(300);
      return (data ?? []) as (EventSurvey & { events?: { id: string; name: string } | null })[];
    }, []),
  ]);

  return (
    <ReportsClient
      events={events}
      dailyReports={dailyReports}
      materials={materials}
      partnerships={partnerships}
      surveys={surveys}
      canViewFinancials={canViewFinancials(user.role, user.can_view_financials)}
    />
  );
}
