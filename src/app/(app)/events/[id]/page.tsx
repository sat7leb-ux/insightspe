import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getEvent, getPartners, getChannels, getProfiles, getEventTypes, getEventParticipants, getEventGoals,
  getDailyReports, getGalleryImages, getGallerySections, getEventContacts, getEventPartnerships,
  getEventMaterials, getSocialFollows, getEventComments, getEventSurveys,
  getTestimonies, getConversations, getActivityLog, getPlatforms, getCountries, getCountryAreas, safe,
} from "@/lib/queries";
import { EventDetailClient } from "@/components/events/event-detail-client";
import { canViewFinancials } from "@/lib/types";
import type { SocialAccount, SocialPost } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const event = await getEvent(id);
  if (!event) notFound();

  const sb = await createClient();

  const [partners, channels, platforms, profiles, eventTypes, countriesList, areas, participants, staffRows, goals, dailyReports, gallery, gallerySections, contacts, partnerships, materials, follows, comments, surveys, testimonies, conversations, activity, allSocialAccounts, socialPostsRaw] = await Promise.all([
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
    getEventSurveys(id),
    getTestimonies(id),
    getConversations(id),
    getActivityLog(id, 40),
    safe(async () => {
      const { data } = await sb
        .from("social_accounts")
        .select("*, channels(id, name, color)")
        .eq("is_active", true)
        .order("platform")
        .order("display_name");
      return (data ?? []) as SocialAccount[];
    }, []),
    safe(async () => {
      const { data } = await sb
        .from("social_posts")
        .select("*, social_accounts(id, platform, handle, display_name, account_url, channel_id, channels(id, name, color)), events(id, name)")
        .eq("event_id", id)
        .order("posted_at", { ascending: false, nullsFirst: false });
      return (data ?? []) as SocialPost[];
    }, []),
  ]);

  // accounts linked to this event (via join table)
  const linkedAccountIds = new Set(
    (await safe(async () => {
      const { data } = await sb.from("event_social_accounts").select("account_id").eq("event_id", id);
      return data ?? [];
    }, [])).map((r: { account_id: string }) => r.account_id),
  );
  const socialAccounts = allSocialAccounts.filter((a) => linkedAccountIds.has(a.id));

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
      comments={comments}
      surveys={surveys}
      testimonies={testimonies}
      conversations={conversations}
      activity={activity}
      socialAccounts={socialAccounts}
      allSocialAccounts={allSocialAccounts}
      socialPosts={socialPostsRaw}
      role={user.role}
      currentUserId={user.id}
      canFinancial={canViewFinancials(user.role, user.can_view_financials)}
    />
  );
}
