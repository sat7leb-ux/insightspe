-- ============================================================
-- Migration 004: Social media linking (accounts + posts)
-- Professional pattern: social_accounts belong to channels,
-- social_posts belong to accounts and optionally link to
-- events + campaigns. external_id fields enable future API sync
-- (Meta Graph API / YouTube Data API) without schema changes.
-- ============================================================

-- Remove SAT-7 PLUS from Channels Supported (soft-deactivate;
-- existing event references stay intact but the picker hides it)
UPDATE public.channels SET is_active = false WHERE slug = 'sat7-plus';

CREATE TABLE IF NOT EXISTS public.social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,                      -- Facebook / Instagram / YouTube / TikTok / Website / Other
  handle text NOT NULL DEFAULT '',             -- @handle or page name
  display_name text NOT NULL,
  account_url text NOT NULL DEFAULT '',
  channel_id uuid REFERENCES public.channels(id) ON DELETE SET NULL,
  followers int NOT NULL DEFAULT 0,
  external_id text NOT NULL DEFAULT '',        -- platform account/page id (for future API sync)
  notes text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform, handle)
);
CREATE INDEX IF NOT EXISTS idx_social_accounts_channel ON public.social_accounts(channel_id);

CREATE TABLE IF NOT EXISTS public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  campaign_tag text NOT NULL DEFAULT '',
  post_url text NOT NULL DEFAULT '',
  content_summary text NOT NULL DEFAULT '',
  post_type text NOT NULL DEFAULT 'Post'
    CHECK (post_type IN ('Post','Video','Reel','Story','Live','Article','Other')),
  posted_at timestamptz,
  -- metrics snapshot
  views bigint NOT NULL DEFAULT 0,
  likes bigint NOT NULL DEFAULT 0,
  comments_count bigint NOT NULL DEFAULT 0,
  shares bigint NOT NULL DEFAULT 0,
  external_id text NOT NULL DEFAULT '',        -- platform post/video id (for future API sync)
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_social_posts_account ON public.social_posts(account_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_event ON public.social_posts(event_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_campaign ON public.social_posts(campaign_tag);

ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_social_accounts_select ON public.social_accounts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY p_social_accounts_write ON public.social_accounts
  FOR ALL TO authenticated
  USING (public.can_write_events()) WITH CHECK (public.can_write_events());

CREATE POLICY p_social_posts_select ON public.social_posts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY p_social_posts_write ON public.social_posts
  FOR ALL TO authenticated
  USING (public.can_write_events()) WITH CHECK (public.can_write_events());

CREATE TRIGGER trg_social_accounts_updated BEFORE UPDATE ON public.social_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_social_posts_updated BEFORE UPDATE ON public.social_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
