import { requireUser } from "@/lib/auth";
import { getAllDailyReports } from "@/lib/queries";
import { DailyReportsClient } from "@/components/daily-reports/daily-reports-client";

export const dynamic = "force-dynamic";

export default async function DailyReportsPage() {
  await requireUser();
  const reports = await getAllDailyReports();
  return <DailyReportsClient reports={reports} />;
}
