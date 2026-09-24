import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getEvent, getPartners, getChannels, getProfiles, getEventTypes, getEventParticipants, getEventGoals,
  getDailyReports, getGalleryImages, getGallerySections, getEventContacts, getEventPartnerships,
  getEventMaterials, getSocialFollows, getEventComments, getEventSurveys,
  getActivityLog, getPlatforms, getCountries, getCountryAreas, safe,
} from "@/lib/queries";
import { EventDetailClient } from "@/components/events/event-detail-client";
import { canViewFinancials } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const event = await getEvent(id);
  if (!event) notFound();

  const sb = await createClient();

  const [partners, channels, platforms, profiles, eventTypes, countriesList, areas, participants, staffRows, goals, dailyReports, gallery, gallerySections, contacts, partnerships, materials, follows, comments, activity] = await Promise.all([
    getPartners(),
    getChannels(),
    getPlatforms(),
    getProfiles(),
    getEventTypes(),
    getCountries(),
    getCountryAreas(),
    getEventParticipants(id),
    safe(async () => {
      const { data } = await sb.from("event_participants").select("user_id").eq("event_id", id).eq("responsibility", "Staff");
      return data ?? [];
    }, []),
    getEventGoals(id),
    getDailyReports(id),
    getGalleryImages(id),
    getGallerySections(id),
    getEventContacts(id),
    getEventPartnerships(id),
    getEventMaterials(id),
    getSocialFollows(id),
    getEventComments(id),
    getActivityLog(id, 40),
  ]);


  const partner = partners.find((p) => p.id === event.partner_id) ?? null;

  return (
    <EventDetailClient
      event={event}
      partner={partner}
      partners={partners}
      channels={channels}
      platforms={platforms}
      profiles={profiles}
      eventTypes={eventTypes}
      countriesList={countriesList}
      areas={areas}
      staffIds={staffRows.map((r: { user_id: string }) => r.user_id)}
      participants={participants}
      goals={goals}
      dailyReports={dailyReports}
      gallery={gallery}
      gallerySections={gallerySections}
      contacts={contacts}
      partnerships={partnerships}
      materials={materials}
      follows={follows}
      activity={activity}
      role={user.role}
      currentUserId={user.id}
      canFinancial={canViewFinancials(user.role, user.can_view_financials)}
    />
  );
}
