-- ============================================================
-- SAT-7 INSIGHTS PORTAL — Public Engagement Module
-- Migration 001: Core schema (wipe + rebuild)
-- Dedicated Supabase project: nexbyquzytajhmklapjs
-- ============================================================

-- ---------- CLEAN SLATE (remove legacy attempt tables) ----------
DROP TABLE IF EXISTS public.project_history CASCADE;
DROP TABLE IF EXISTS public.project_files CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.public_messages CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.gallery_items CASCADE;
DROP TABLE IF EXISTS public.event_materials CASCADE;
DROP TABLE IF EXISTS public.audience_breakdowns CASCADE;
DROP TABLE IF EXISTS public.event_platforms CASCADE;
DROP TABLE IF EXISTS public.event_channels CASCADE;
DROP TABLE IF EXISTS public.event_contacts CASCADE;
DROP TABLE IF EXISTS public.event_testimonies CASCADE;
DROP TABLE IF EXISTS public.event_conversations CASCADE;
DROP TABLE IF EXISTS public.event_gallery CASCADE;
DROP TABLE IF EXISTS public.daily_reports CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.partners CASCADE;
DROP TABLE IF EXISTS public.material_types CASCADE;
DROP TABLE IF EXISTS public.event_types CASCADE;
DROP TABLE IF EXISTS public.platforms CASCADE;
DROP TABLE IF EXISTS public.countries CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.testimonies CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.channels CASCADE;
DROP TABLE IF EXISTS public.programs CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin() CASCADE;
DROP FUNCTION IF EXISTS public.can_view_financials() CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;

-- ============================================================
-- ENUMS / DOMAIN TYPES
-- ============================================================
CREATE TYPE public.user_role AS ENUM ('super_admin','admin','manager','event_manager','contributor','viewer');

-- ============================================================
-- REFERENCE TABLES
-- ============================================================
CREATE TABLE public.channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#2563eb',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,          -- ISO 3166-1 alpha-2
  region text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.event_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#64748b',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#8b5cf6',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.material_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  unit text NOT NULL DEFAULT 'pcs',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  partner_type text NOT NULL DEFAULT 'Church',  -- Church/Diocese/School/NGO/Other
  country text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  contact_person text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);
CREATE INDEX idx_partners_name ON public.partners(name);
CREATE INDEX idx_partners_country ON public.partners(country);

-- ============================================================
-- PROFILES (user management)
-- ============================================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role public.user_role NOT NULL DEFAULT 'contributor',
  dept text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  avatar_url text NOT NULL DEFAULT '',
  can_view_financials boolean NOT NULL DEFAULT false,
  must_change_password boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  last_active_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- ============================================================
-- EVENTS (core)
-- ============================================================
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  start_date date NOT NULL,
  end_date date NOT NULL,
  city text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  event_type text NOT NULL DEFAULT 'School Outreach',
  status text NOT NULL DEFAULT 'Planning'
    CHECK (status IN ('Planning','Confirmed','In Progress','Completed','Cancelled','Archived')),
  channel_ids uuid[] NOT NULL DEFAULT '{}',
  adults int NOT NULL DEFAULT 0 CHECK (adults >= 0),
  children int NOT NULL DEFAULT 0 CHECK (children >= 0),
  staff_count int NOT NULL DEFAULT 0 CHECK (staff_count >= 0),
  volunteer_count int NOT NULL DEFAULT 0 CHECK (volunteer_count >= 0),
  manager_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  campaign_tag text NOT NULL DEFAULT '',
  -- reach & engagement
  views bigint NOT NULL DEFAULT 0,
  unique_views bigint NOT NULL DEFAULT 0,
  shares bigint NOT NULL DEFAULT 0,
  comments_count bigint NOT NULL DEFAULT 0,
  likes bigint NOT NULL DEFAULT 0,
  platform_ids uuid[] NOT NULL DEFAULT '{}',
  -- financial (restricted)
  budget numeric(14,2),
  actual_cost numeric(14,2),
  currency text NOT NULL DEFAULT 'USD',
  cost_notes text NOT NULL DEFAULT '',
  -- pipeline stage
  stage text NOT NULL DEFAULT 'Planning'
    CHECK (stage IN ('Planning','Preparation','Event','Follow-up','Completed')),
  -- audit
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  CHECK (end_date >= start_date)
);
CREATE INDEX idx_events_start ON public.events(start_date);
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_events_country ON public.events(country);
CREATE INDEX idx_events_type ON public.events(event_type);
CREATE INDEX idx_events_partner ON public.events(partner_id);
CREATE INDEX idx_events_deleted ON public.events(is_deleted);
CREATE INDEX idx_events_channels ON public.events USING gin(channel_ids);

-- ============================================================
-- EVENT CHILD TABLES
-- ============================================================
CREATE TABLE public.event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  responsibility text NOT NULL DEFAULT '',
  participation_status text NOT NULL DEFAULT 'Confirmed'
    CHECK (participation_status IN ('Invited','Confirmed','Attended','Declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
CREATE INDEX idx_ep_event ON public.event_participants(event_id);
CREATE INDEX idx_ep_user ON public.event_participants(user_id);

CREATE TABLE public.event_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  goal text NOT NULL,
  target numeric(14,2) NOT NULL DEFAULT 0,
  current_value numeric(14,2) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT '',
  deadline date,
  responsible_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'Not Started'
    CHECK (status IN ('Not Started','In Progress','On Track','At Risk','Completed')),
  notes text NOT NULL DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_goals_event ON public.event_goals(event_id);

CREATE TABLE public.event_daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  report_date date NOT NULL,
  day_number int NOT NULL DEFAULT 1,
  location text NOT NULL DEFAULT '',
  staff_present int NOT NULL DEFAULT 0,
  volunteers int NOT NULL DEFAULT 0,
  adults int NOT NULL DEFAULT 0,
  children int NOT NULL DEFAULT 0,
  activities text NOT NULL DEFAULT '',
  meetings text NOT NULL DEFAULT '',
  contacts_collected int NOT NULL DEFAULT 0,
  partnerships_discussed int NOT NULL DEFAULT 0,
  materials_distributed int NOT NULL DEFAULT 0,
  digital_engagement text NOT NULL DEFAULT '',
  problems text NOT NULL DEFAULT '',
  successes text NOT NULL DEFAULT '',
  follow_up_actions text NOT NULL DEFAULT '',
  comments text NOT NULL DEFAULT '',
  submitted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, report_date)
);
CREATE INDEX idx_daily_event ON public.event_daily_reports(event_id);
CREATE INDEX idx_daily_date ON public.event_daily_reports(report_date);

CREATE TABLE public.event_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  caption text NOT NULL DEFAULT '',
  image_date date,
  photographer text NOT NULL DEFAULT '',
  is_featured boolean NOT NULL DEFAULT false,
  width int,
  height int,
  size_bytes bigint,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_gallery_event ON public.event_gallery(event_id);

CREATE TABLE public.event_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  contact_type text NOT NULL DEFAULT 'Church Leader', -- Church Leader/Teacher/Parent/Student/NGO/Other
  source text NOT NULL DEFAULT '',
  contact_date date NOT NULL DEFAULT CURRENT_DATE,
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  is_minor boolean NOT NULL DEFAULT false,
  parental_consent boolean NOT NULL DEFAULT false,
  follow_up_status text NOT NULL DEFAULT 'New'
    CHECK (follow_up_status IN ('New','Contacted','Meeting Scheduled','Follow-up','Closed','Lost')),
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes text NOT NULL DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_contacts_event ON public.event_contacts(event_id);
CREATE INDEX idx_contacts_minor ON public.event_contacts(is_minor);

CREATE TABLE public.event_partnerships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  organization text NOT NULL,
  partnership_type text NOT NULL DEFAULT 'Church',
  country text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  contact_person text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Prospect'
    CHECK (status IN ('Prospect','Contacted','Meeting','Negotiation','Active','Follow-up','Closed')),
  follow_up_date date,
  responsible_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes text NOT NULL DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_partnerships_event ON public.event_partnerships(event_id);
CREATE INDEX idx_partnerships_status ON public.event_partnerships(status);

CREATE TABLE public.event_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit text NOT NULL DEFAULT 'pcs',
  notes text NOT NULL DEFAULT '',
  -- denormalized event link kept for "materials by country/channel" rollups
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_materials_event ON public.event_materials(event_id);

CREATE TABLE public.event_social_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'Facebook',
  channel text NOT NULL DEFAULT '',
  follows_gained int NOT NULL DEFAULT 0,
  follow_date date NOT NULL DEFAULT CURRENT_DATE,
  source_campaign text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_follows_event ON public.event_social_follows(event_id);

CREATE TABLE public.event_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.event_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  mentions uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);
CREATE INDEX idx_comments_event ON public.event_comments(event_id);

-- ============================================================
-- SURVEYS
-- ============================================================
CREATE TABLE public.survey_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  question_type text NOT NULL DEFAULT 'rating'
    CHECK (question_type IN ('rating','yes_no_maybe','text')),
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.event_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  respondent_name text NOT NULL DEFAULT '',
  respondent_role text NOT NULL DEFAULT 'Participant',
  overall_experience int NOT NULL CHECK (overall_experience BETWEEN 1 AND 5),
  organization_rating int NOT NULL CHECK (organization_rating BETWEEN 1 AND 5),
  communication_rating int NOT NULL CHECK (communication_rating BETWEEN 1 AND 5),
  event_value_rating int NOT NULL CHECK (event_value_rating BETWEEN 1 AND 5),
  would_participate_again text NOT NULL DEFAULT 'Maybe'
    CHECK (would_participate_again IN ('Yes','No','Maybe')),
  what_worked text NOT NULL DEFAULT '',
  what_to_improve text NOT NULL DEFAULT '',
  additional_comments text NOT NULL DEFAULT '',
  submitted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  submitted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_surveys_event ON public.event_surveys(event_id);

-- ============================================================
-- TESTIMONIES & CONVERSATIONS (existing portal concepts, linked to events)
-- ============================================================
CREATE TABLE public.testimonies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  channel_id uuid REFERENCES public.channels(id) ON DELETE SET NULL,
  author_name text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  summary text NOT NULL,
  full_text text NOT NULL DEFAULT '',
  content_date date,
  is_public boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_testimonies_event ON public.testimonies(event_id);

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  channel_id uuid REFERENCES public.channels(id) ON DELETE SET NULL,
  platform text NOT NULL DEFAULT '',
  person_name text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  summary text NOT NULL,
  message_count int NOT NULL DEFAULT 0,
  is_follow_up_required boolean NOT NULL DEFAULT false,
  content_date date,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_conversations_event ON public.conversations(event_id);

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE public.event_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name text NOT NULL DEFAULT '',
  action text NOT NULL,
  entity_type text NOT NULL DEFAULT '',
  entity_id uuid,
  entity_name text NOT NULL DEFAULT '',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_log_entity ON public.event_activity_log(entity_type, entity_id);
CREATE INDEX idx_log_created ON public.event_activity_log(created_at DESC);

-- ============================================================
-- SETTINGS
-- ============================================================
CREATE TABLE public.settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
