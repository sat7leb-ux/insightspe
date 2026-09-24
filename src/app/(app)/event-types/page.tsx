import { requireUser } from "@/lib/auth";
import { getEventTypes } from "@/lib/queries";
import { EventTypesClient } from "@/components/event-types/event-types-client";

export const dynamic = "force-dynamic";

export default async function EventTypesPage() {
  const user = await requireUser();
  const eventTypes = await getEventTypes(true);
  return <EventTypesClient eventTypes={eventTypes} role={user.role} />;
}
