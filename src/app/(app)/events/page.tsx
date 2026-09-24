import { requireUser } from "@/lib/auth";
import { getEvents, getPartners, getChannels, getProfiles, getEventTypes, getCountries, getCountryAreas } from "@/lib/queries";
import { EventsClient } from "@/components/events/events-client";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const user = await requireUser();
  const [events, partners, channels, profiles, eventTypes, countriesList, areas] = await Promise.all([
    getEvents({ includeArchived: true }),
    getPartners(),
    getChannels(),
    getProfiles(),
    getEventTypes(),
    getCountries(),
    getCountryAreas(),
  ]);

  return (
    <Suspense>
      <EventsClient
        events={events}
        partners={partners}
        channels={channels}
        profiles={profiles}
        eventTypes={eventTypes}
        areas={areas}
        countriesList={countriesList}
        role={user.role}
      />
    </Suspense>
  );
}
