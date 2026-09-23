import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  EventRow, Partner, Channel, Country, EventTypeRow, Platform, MaterialType,
  Profile, EventParticipant, EventGoal, DailyReport, GalleryImage, EventContact,
  EventPartnership, EventMaterial, SocialFollow, EventComment, EventSurvey,
  Testimony, Conversation, ActivityLogEntry, SurveyQuestion,
} from "@/lib/types";

/** Wrap a query so a DB outage degrades to an empty state, never a 500. */
export async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

const sb = () => createClient();

// ---------------- reference data ----------------
export async function getChannels(): Promise<Channel[]> {
  return safe(async () => {
    const { data } = await sb().from("channels").select("*").eq("is_active", true).order("sort_order");
    return (data ?? []) as Channel[];
  }, []);
}
export async function getCountries(): Promise<Country[]> {
  return safe(async () => {
    const { data } = await sb().from("countries").select("*").eq("is_active", true).order("name");
    return (data ?? []) as Country[];
  }, []);
}
export async function getEventTypes(): Promise<EventTypeRow[]> {
  return safe(async () => {
    const { data } = await sb().from("event_types").select("*").eq("is_active", true).order("sort_order");
    return (data ?? []) as EventTypeRow[];
  }, []);
}
export async function getPlatforms(): Promise<Platform[]> {
  return safe(async () => {
    const { data } = await sb().from("platforms").select("*").eq("is_active", true).order("sort_order");
    return (data ?? []) as Platform[];
  }, []);
}
export async function getMaterialTypes(): Promise<MaterialType[]> {
  return safe(async () => {
    const { data } = await sb().from("material_types").select("*").eq("is_active", true).order("sort_order");
    return (data ?? []) as MaterialType[];
  }, []);
}
export async function getPartners(): Promise<Partner[]> {
  return safe(async () => {
    const { data } = await sb().from("partners").select("*").eq("is_deleted", false).order("name");
    return (data ?? []) as Partner[];
  }, []);
}
export async function getProfiles(): Promise<Profile[]> {
  return safe(async () => {
    const { data } = await sb().from("profiles").select("*").order("full_name");
    return (data ?? []) as Profile[];
  }, []);
}
export async function getSurveyQuestions(): Promise<SurveyQuestion[]> {
  return safe(async () => {
    const { data } = await sb().from("survey_questions").select("*").eq("is_active", true).order("sort_order");
    return (data ?? []) as SurveyQuestion[];
  }, []);
}

// ---------------- events ----------------
export interface EventFilters {
  country?: string;
  eventType?: string;
  partnerId?: string;
  channelId?: string;
  status?: string;
  managerId?: string;
  campaign?: string;
  platform?: string;
  dateFrom?: string;
  dateTo?: string;
  q?: string;
  includeArchived?: boolean;
}

export async function getEvents(filters: EventFilters = {}): Promise<EventRow[]> {
  return safe(async () => {
    let query = sb().from("events").select("*").order("start_date", { ascending: false }).limit(500);

    if (!filters.includeArchived) query = query.neq("status", "Archived");
    if (filters.country) query = query.eq("country", filters.country);
    if (filters.eventType) query = query.eq("event_type", filters.eventType);
    if (filters.partnerId) query = query.eq("partner_id", filters.partnerId);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.managerId) query = query.eq("manager_id", filters.managerId);
    if (filters.campaign) query = query.ilike("campaign_tag", `%${filters.campaign}%`);
    if (filters.dateFrom) query = query.gte("end_date", filters.dateFrom);
    if (filters.dateTo) query = query.lte("start_date", filters.dateTo);
    if (filters.q) query = query.or(`name.ilike.%${filters.q}%,city.ilike.%${filters.q}%,description.ilike.%${filters.q}%`);
    if (filters.channelId) query = query.contains("channel_ids", [filters.channelId]);
    if (filters.platform) query = query.contains("platform_ids", [filters.platform]);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as EventRow[];
  }, []);
}

export async function getEvent(id: string): Promise<EventRow | null> {
  return safe(async () => {
    const { data } = await sb().from("events").select("*").eq("id", id).maybeSingle();
    return data as EventRow | null;
  }, null);
}

// ---------------- event children ----------------
export async function getEventParticipants(eventId: string): Promise<EventParticipant[]> {
  return safe(async () => {
    const { data } = await sb()
      .from("event_participants")
      .select("*, profiles(id, full_name, email, role, dept)")
      .eq("event_id", eventId)
      .order("created_at");
    return (data ?? []) as EventParticipant[];
  }, []);
}

export async function getEventGoals(eventId: string): Promise<EventGoal[]> {
  return safe(async () => {
    const { data } = await sb()
      .from("event_goals")
      .select("*, profiles(id, full_name)")
      .eq("event_id", eventId)
      .order("created_at");
    return (data ?? []) as EventGoal[];
  }, []);
}

export async function getAllGoals(): Promise<(EventGoal & { events?: { id: string; name: string } | null })[]> {
  return safe(async () => {
    const { data } = await sb()
      .from("event_goals")
      .select("*, events(id, name), profiles(id, full_name)")
      .order("created_at", { ascending: false })
      .limit(300);
    return (data ?? []) as (EventGoal & { events?: { id: string; name: string } | null })[];
  }, []);
}

export async function getDailyReports(eventId: string): Promise<DailyReport[]> {
  return safe(async () => {
    const { data } = await sb()
      .from("event_daily_reports")
      .select("*, profiles(id, full_name)")
      .eq("event_id", eventId)
      .order("report_date");
    return (data ?? []) as DailyReport[];
  }, []);
}

export async function getAllDailyReports(): Promise<(DailyReport & { events?: { id: string; name: string } | null })[]> {
  return safe(async () => {
    const { data } = await sb()
      .from("event_daily_reports")
      .select("*, events(id, name), profiles(id, full_name)")
      .order("report_date", { ascending: false })
      .limit(500);
    return (data ?? []) as (DailyReport & { events?: { id: string; name: string } | null })[];
  }, []);
}

export async function getGalleryImages(eventId: string): Promise<GalleryImage[]> {
  return safe(async () => {
    const { data } = await sb()
      .from("event_gallery")
      .select("*, profiles(id, full_name)")
      .eq("event_id", eventId)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false });
    return (data ?? []) as GalleryImage[];
  }, []);
}

export async function getEventContacts(eventId: string): Promise<EventContact[]> {
  return safe(async () => {
    const { data } = await sb()
      .from("event_contacts")
      .select("*, profiles(id, full_name)")
      .eq("event_id", eventId)
      .order("created_at");
    return (data ?? []) as EventContact[];
  }, []);
}

export async function getEventPartnerships(eventId: string): Promise<EventPartnership[]> {
  return safe(async () => {
    const { data } = await sb()
      .from("event_partnerships")
      .select("*, profiles(id, full_name)")
      .eq("event_id", eventId)
      .order("created_at");
    return (data ?? []) as EventPartnership[];
  }, []);
}

export async function getAllPartnerships(): Promise<(EventPartnership & { events?: { id: string; name: string } | null })[]> {
  return safe(async () => {
    const { data } = await sb()
      .from("event_partnerships")
      .select("*, events(id, name), profiles(id, full_name)")
      .order("created_at", { ascending: false })
      .limit(300);
    return (data ?? []) as (EventPartnership & { events?: { id: string; name: string } | null })[];
  }, []);
}

export async function getEventMaterials(eventId: string): Promise<EventMaterial[]> {
  return safe(async () => {
    const { data } = await sb().from("event_materials").select("*").eq("event_id", eventId).order("created_at");
    return (data ?? []) as EventMaterial[];
  }, []);
}

export async function getAllMaterials(): Promise<(EventMaterial & { events?: { id: string; name: string; country: string } | null })[]> {
  return safe(async () => {
    const { data } = await sb()
      .from("event_materials")
      .select("*, events(id, name, country)")
      .order("created_at", { ascending: false })
      .limit(500);
    return (data ?? []) as (EventMaterial & { events?: { id: string; name: string; country: string } | null })[];
  }, []);
}

export async function getSocialFollows(eventId: string): Promise<SocialFollow[]> {
  return safe(async () => {
    const { data } = await sb().from("event_social_follows").select("*").eq("event_id", eventId).order("follow_date");
    return (data ?? []) as SocialFollow[];
  }, []);
}

export async function getEventComments(eventId: string): Promise<EventComment[]> {
  return safe(async () => {
    const { data } = await sb()
      .from("event_comments")
      .select("*, profiles(id, full_name, avatar_url)")
      .eq("event_id", eventId)
      .eq("is_deleted", false)
      .order("created_at");
    return (data ?? []) as EventComment[];
  }, []);
}

export async function getEventSurveys(eventId: string): Promise<EventSurvey[]> {
  return safe(async () => {
    const { data } = await sb().from("event_surveys").select("*").eq("event_id", eventId).order("submitted_at");
    return (data ?? []) as EventSurvey[];
  }, []);
}

export async function getTestimonies(eventId?: string): Promise<(Testimony & { events?: { id: string; name: string } | null })[]> {
  return safe(async () => {
    let query = sb()
      .from("testimonies")
      .select("*, events(id, name)")
      .order("created_at", { ascending: false })
      .limit(300);
    if (eventId) query = query.eq("event_id", eventId);
    const { data } = await query;
    return (data ?? []) as (Testimony & { events?: { id: string; name: string } | null })[];
  }, []);
}

export async function getConversations(eventId?: string): Promise<(Conversation & { events?: { id: string; name: string } | null })[]> {
  return safe(async () => {
    let query = sb()
      .from("conversations")
      .select("*, events(id, name)")
      .order("created_at", { ascending: false })
      .limit(300);
    if (eventId) query = query.eq("event_id", eventId);
    const { data } = await query;
    return (data ?? []) as (Conversation & { events?: { id: string; name: string } | null })[];
  }, []);
}

export async function getActivityLog(entityId?: string, limit = 50): Promise<ActivityLogEntry[]> {
  return safe(async () => {
    let query = sb()
      .from("event_activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (entityId) query = query.eq("entity_id", entityId);
    const { data } = await query;
    return (data ?? []) as ActivityLogEntry[];
  }, []);
}

export async function getMyEvents(userId: string): Promise<EventRow[]> {
  return safe(async () => {
    const { data } = await sb()
      .from("events")
      .select(`
        *,
        event_participants!inner(user_id)
      `)
      .eq("event_participants.user_id", userId)
      .neq("status", "Archived")
      .order("start_date", { ascending: false });
    return (data ?? []) as unknown as EventRow[];
  }, []);
}
