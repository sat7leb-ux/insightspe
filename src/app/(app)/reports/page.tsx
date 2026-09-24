import { requireUser } from "@/lib/auth";
import { getEvents, getAllDailyReports, getAllMaterials, getAllPartnerships } from "@/lib/queries";
import { ReportsClient } from "@/components/reports/reports-client";
import { canViewFinancials } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await requireUser();
  const [events, dailyReports, materials, partnerships] = await Promise.all([
    getEvents({}),
    getAllDailyReports(),
    getAllMaterials(),
    getAllPartnerships(),
  ]);

  return (
    <ReportsClient
      events={events}
      dailyReports={dailyReports}
      materials={materials}
      partnerships={partnerships}
      canViewFinancials={canViewFinancials(user.role, user.can_view_financials)}
    />
  );
}
