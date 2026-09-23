import { requireUser } from "@/lib/auth";
import { getEvents, getPartners, getChannels, getProfiles, getEventTypes } from "@/lib/queries";
import { EventsClient } from "@/components/events/events-client";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const user = await requireUser();
  const [events, partners, channels, profiles, eventTypes] = await Promise.all([
    getEvents({ includeArchived: true }),
    getPartners(),
    getChannels(),
    getProfiles(),
    getEventTypes(),
  ]);

  return (
    <Suspense>
      <EventsClient
        events={events}
        partners={partners}
        channels={channels}
        profiles={profiles}
        eventTypes={eventTypes}
        role={user.role}
      />
    </Suspense>
  );
}
