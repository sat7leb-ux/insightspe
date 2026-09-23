import { requireUser } from "@/lib/auth";
import { getEvents } from "@/lib/queries";
import { CalendarClient } from "@/components/calendar/calendar-client";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  await requireUser();
  const events = await getEvents({ includeArchived: true });
  return <CalendarClient events={events} />;
}
