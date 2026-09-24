// ============================================================
// Domain types mirroring the Supabase schema
// ============================================================

export type UserRole = 'super_admin' | 'admin' | 'manager' | 'event_manager' | 'contributor' | 'viewer';

export const USER_ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'super_admin', label: 'Super Admin', description: 'Full access to everything including user management and settings.' },
  { value: 'admin', label: 'Admin', description: 'Manage events, users, reports and analytics.' },
  { value: 'manager', label: 'Manager', description: 'View dashboards, events, reports and analytics.' },
  { value: 'event_manager', label: 'Event Manager', description: 'Create and manage assigned events.' },
  { value: 'contributor', label: 'Contributor', description: 'Enter event information, daily reports, gallery images, materials and surveys.' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access.' },
];

export const ROLE_RANK: Record<UserRole, number> = {
  super_admin: 100,
  admin: 80,
  manager: 60,
  event_manager: 50,
  contributor: 40,
  viewer: 20,
};

export const EVENT_STATUSES = ['Planning', 'Confirmed', 'In Progress', 'Completed', 'Cancelled', 'Archived'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_TYPES = ['School Outreach', 'Church Partnership', 'Festival / Booth', 'Conference', 'Digital Campaign', 'Community Outreach', 'Hybrid Event', 'Other'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_STAGES = ['Planning', 'Preparation', 'Event', 'Follow-up', 'Completed'] as const;
export type EventStage = (typeof EVENT_STAGES)[number];

export const GOAL_STATUSES = ['Not Started', 'In Progress', 'On Track', 'At Risk', 'Completed'] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export const PARTNERSHIP_STATUSES = ['Prospect', 'Contacted', 'Meeting', 'Negotiation', 'Active', 'Follow-up', 'Closed'] as const;
export type PartnershipStatus = (typeof PARTNERSHIP_STATUSES)[number];

export const FOLLOW_UP_STATUSES = ['New', 'Contacted', 'Meeting Scheduled', 'Follow-up', 'Closed', 'Lost'] as const;

export const PARTICIPATION_STATUSES = ['Invited', 'Confirmed', 'Attended', 'Declined'] as const;

export const PARTNER_TYPES = ['Church', 'Diocese', 'School', 'NGO', 'Other'] as const;

export const CONTACT_TYPES = ['Church Leader', 'Teacher', 'Parent', 'Student', 'NGO', 'Other'] as const;

export const PLATFORM_NAMES = ['Facebook', 'Instagram', 'YouTube', 'SAT-7 Plus', 'Website', 'TikTok', 'Other'] as const;

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  dept: string;
  phone: string;
  avatar_url: string;
  can_view_financials: boolean;
  must_change_password: boolean;
  is_active: boolean;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Channel {
  id: string;
  name: string;
  slug: string;
  color: string;
  sort_order: number;
  is_active: boolean;
}

export interface Country {
  id: string;
  name: string;
  code: string;
  region: string;
  is_active: boolean;
}

export interface EventTypeRow { id: string; name: string; slug: string; color: string; sort_order: number; is_active: boolean; }
export interface Platform { id: string; name: string; slug: string; color: string; sort_order: number; is_active: boolean; }
export interface MaterialType { id: string; name: string; unit: string; sort_order: number; is_active: boolean; }

export interface Partner {
  id: string;
  name: string;
  partner_type: string;
  country: string;
  city: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  notes: string;
  created_at: string;
  is_deleted: boolean;
}

export interface EventRow {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  city: string;
  country: string;
  partner_id: string | null;
  event_type: string;
  status: EventStatus;
  channel_ids: string[];
  adults: number;
  children: number;
  staff_count: number;
  volunteer_count: number;
  manager_id: string | null;
  campaign_tag: string;
  views: number;
  unique_views: number;
  shares: number;
  comments_count: number;
  likes: number;
  platform_ids: string[];
  budget: number | null;
  actual_cost: number | null;
  currency: string;
  cost_notes: string;
  stage: EventStage;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface EventParticipant {
  id: string;
  event_id: string;
  user_id: string;
  responsibility: string;
  participation_status: string;
  created_at: string;
  profiles?: Pick<Profile, 'id' | 'full_name' | 'email' | 'role' | 'dept'> | null;
}

export interface EventGoal {
  id: string;
  event_id: string;
  goal: string;
  target: number;
  current_value: number;
  unit: string;
  deadline: string | null;
  responsible_id: string | null;
  status: GoalStatus;
  notes: string;
  created_at: string;
  updated_at: string;
  profiles?: Pick<Profile, 'id' | 'full_name'> | null;
}

export interface DailyReport {
  id: string;
  event_id: string;
  report_date: string;
  day_number: number;
  location: string;
  staff_present: number;
  volunteers: number;
  adults: number;
  children: number;
  activities: string;
  meetings: string;
  contacts_collected: number;
  partnerships_discussed: number;
  materials_distributed: number;
  digital_engagement: string;
  problems: string;
  successes: string;
  follow_up_actions: string;
  comments: string;
  submitted_by: string | null;
  submitted_at: string;
  profiles?: Pick<Profile, 'id' | 'full_name'> | null;
}

export interface GallerySection {
  id: string;
  event_id: string;
  name: string;
  description: string;
  sort_order: number;
  created_at: string;
}

export interface GalleryImage {
  id: string;
  event_id: string;
  section_id: string | null;
  storage_path: string;
  public_url: string;
  caption: string;
  image_date: string | null;
  photographer: string;
  is_featured: boolean;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
  profiles?: Pick<Profile, 'id' | 'full_name'> | null;
}

export interface EventContact {
  id: string;
  event_id: string;
  name: string;
  contact_type: string;
  source: string;
  contact_date: string;
  email: string;
  phone: string;
  is_minor: boolean;
  parental_consent: boolean;
  follow_up_status: string;
  assigned_to: string | null;
  notes: string;
  created_at: string;
  profiles?: Pick<Profile, 'id' | 'full_name'> | null;
}

export interface EventPartnership {
  id: string;
  event_id: string;
  organization: string;
  partnership_type: string;
  country: string;
  city: string;
  contact_person: string;
  status: PartnershipStatus;
  follow_up_date: string | null;
  responsible_id: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
  profiles?: Pick<Profile, 'id' | 'full_name'> | null;
}

export interface EventMaterial {
  id: string;
  item: string;
  quantity: number;
  unit: string;
  notes: string;
  event_id: string;
  created_at: string;
}

export interface SocialFollow {
  id: string;
  event_id: string;
  platform: string;
  channel: string;
  follows_gained: number;
  follow_date: string;
  source_campaign: string;
}

export interface EventComment {
  id: string;
  event_id: string;
  parent_id: string | null;
  user_id: string;
  body: string;
  mentions: string[];
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  profiles?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null;
}

export interface SurveyQuestion {
  id: string;
  question: string;
  question_type: 'rating' | 'yes_no_maybe' | 'text';
  is_active: boolean;
  sort_order: number;
}

export interface EventSurvey {
  id: string;
  event_id: string;
  respondent_name: string;
  respondent_role: string;
  overall_experience: number;
  organization_rating: number;
  communication_rating: number;
  event_value_rating: number;
  would_participate_again: 'Yes' | 'No' | 'Maybe';
  what_worked: string;
  what_to_improve: string;
  additional_comments: string;
  submitted_by: string | null;
  submitted_at: string;
}

export interface Testimony {
  id: string;
  event_id: string | null;
  channel_id: string | null;
  author_name: string;
  country: string;
  summary: string;
  full_text: string;
  content_date: string | null;
  is_public: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  event_id: string | null;
  channel_id: string | null;
  platform: string;
  person_name: string;
  country: string;
  summary: string;
  message_count: number;
  is_follow_up_required: boolean;
  content_date: string | null;
  created_at: string;
}

export interface ActivityLogEntry {
  id: string;
  user_id: string | null;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface SessionUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  dept: string;
  avatar_url: string;
  can_view_financials: boolean;
  must_change_password: boolean;
  is_active: boolean;
}

// ---- permissions helper ----
export function canWriteEvents(role: UserRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK.contributor;
}
export function canManageUsers(role: UserRole): boolean {
  return role === 'super_admin' || role === 'admin';
}
export function canViewFinancials(role: UserRole, flag: boolean): boolean {
  return role === 'super_admin' || role === 'admin' || flag;
}
