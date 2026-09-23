import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getEvent, getPartners, getChannels, getProfiles, getEventParticipants, getEventGoals,
  getDailyReports, getGalleryImages, getEventContacts, getEventPartnerships,
  getEventMaterials, getSocialFollows, getEventComments, getEventSurveys,
  getTestimonies, getConversations, getActivityLog, getPlatforms, safe,
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

  const [partners, channels, platforms, profiles, participants, goals, dailyReports, gallery, contacts, partnerships, materials, follows, comments, surveys, testimonies, conversations, activity] = await Promise.all([
    getPartners(),
    getChannels(),
    getPlatforms(),
    getProfiles(),
    getEventParticipants(id),
    getEventGoals(id),
    getDailyReports(id),
    getGalleryImages(id),
    getEventContacts(id),
    getEventPartnerships(id),
    getEventMaterials(id),
    getSocialFollows(id),
    getEventComments(id),
    getEventSurveys(id),
    getTestimonies(id),
    getConversations(id),
    getActivityLog(id, 40),
  ]);

  const partner = partners.find((p) => p.id === event.partner_id) ?? null;

  return (
    <EventDetailClient
      event={event}
      partner={partner}
      channels={channels}
      platforms={platforms}
      profiles={profiles}
      participants={participants}
      goals={goals}
      dailyReports={dailyReports}
      gallery={gallery}
      contacts={contacts}
      partnerships={partnerships}
      materials={materials}
      follows={follows}
      comments={comments}
      surveys={surveys}
      testimonies={testimonies}
      conversations={conversations}
      activity={activity}
      role={user.role}
      currentUserId={user.id}
      canFinancial={canViewFinancials(user.role, user.can_view_financials)}
    />
  );
}
