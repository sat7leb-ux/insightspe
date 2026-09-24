-- ============================================================
-- Migration 005: event <-> social account linking
-- ============================================================

CREATE TABLE IF NOT EXISTS public.event_social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  linked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, account_id)
);
CREATE INDEX IF NOT EXISTS idx_event_social_accounts_event ON public.event_social_accounts(event_id);
CREATE INDEX IF NOT EXISTS idx_event_social_accounts_account ON public.event_social_accounts(account_id);

ALTER TABLE public.event_social_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_event_social_accounts_select ON public.event_social_accounts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY p_event_social_accounts_write ON public.event_social_accounts
  FOR ALL TO authenticated
  USING (public.can_write_events()) WITH CHECK (public.can_write_events());
