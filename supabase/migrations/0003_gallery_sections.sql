-- ============================================================
-- Migration 003: Gallery sections + partner management support
-- ============================================================

CREATE TABLE IF NOT EXISTS public.event_gallery_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gallery_sections_event ON public.event_gallery_sections(event_id);

ALTER TABLE public.event_gallery ADD COLUMN IF NOT EXISTS section_id uuid
  REFERENCES public.event_gallery_sections(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_gallery_section ON public.event_gallery(section_id);

ALTER TABLE public.event_gallery_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_gallery_sections_select ON public.event_gallery_sections
  FOR SELECT TO authenticated USING (true);
CREATE POLICY p_gallery_sections_write ON public.event_gallery_sections
  FOR ALL TO authenticated
  USING (public.can_write_events()) WITH CHECK (public.can_write_events());
