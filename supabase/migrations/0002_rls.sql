-- ============================================================
-- Migration 002: Functions, triggers, RLS policies, storage
-- ============================================================

-- ---------- Helper functions (SECURITY DEFINER to avoid RLS recursion) ----------
CREATE OR REPLACE FUNCTION public.current_role_name()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(public.current_role_name() IN ('super_admin','admin'), false);
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(public.current_role_name() = 'super_admin', false);
$$;

CREATE OR REPLACE FUNCTION public.can_write_events() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(public.current_role_name() IN ('super_admin','admin','event_manager','contributor'), false);
$$;

CREATE OR REPLACE FUNCTION public.can_edit_users() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(public.current_role_name() IN ('super_admin','admin'), false);
$$;

CREATE OR REPLACE FUNCTION public.can_view_financials() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(
    (SELECT can_view_financials OR role IN ('super_admin','admin')
     FROM public.profiles WHERE id = auth.uid()),
    false);
$$;

-- ---------- Triggers ----------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_partners_updated BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_events_updated BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_goals_updated BEFORE UPDATE ON public.event_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_partnerships_updated BEFORE UPDATE ON public.event_partnerships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_comments_updated BEFORE UPDATE ON public.event_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile row on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    coalesce(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    'contributor'
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_handle_new_user AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-log event created/updated
CREATE OR REPLACE FUNCTION public.log_event_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid; v_name text;
BEGIN
  SELECT id, full_name INTO v_user, v_name FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.event_activity_log (user_id, user_name, action, entity_type, entity_id, entity_name)
  VALUES (v_user, v_name, TG_ARGV[0], 'event', NEW.id, NEW.name);
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_event_created AFTER INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.log_event_change('created');
CREATE TRIGGER trg_event_updated AFTER UPDATE ON public.events
  FOR EACH ROW WHEN (OLD IS DISTINCT FROM NEW) EXECUTE FUNCTION public.log_event_change('updated');

-- ---------- RLS ----------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_social_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- profiles: everyone authenticated can read minimal; self-update; admin manage
CREATE POLICY p_profiles_select ON public.profiles FOR SELECT TO authenticated
  USING (true);
CREATE POLICY p_profiles_update_self ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY p_profiles_insert_self ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY p_profiles_admin_all ON public.profiles FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- reference tables: read all authenticated; write admin+
CREATE POLICY p_channels_all ON public.channels FOR SELECT TO authenticated USING (true);
CREATE POLICY p_channels_write ON public.channels FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY p_countries_all ON public.countries FOR SELECT TO authenticated USING (true);
CREATE POLICY p_countries_write ON public.countries FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY p_event_types_all ON public.event_types FOR SELECT TO authenticated USING (true);
CREATE POLICY p_event_types_write ON public.event_types FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY p_platforms_all ON public.platforms FOR SELECT TO authenticated USING (true);
CREATE POLICY p_platforms_write ON public.platforms FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY p_material_types_all ON public.material_types FOR SELECT TO authenticated USING (true);
CREATE POLICY p_material_types_write ON public.material_types FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY p_partners_select ON public.partners FOR SELECT TO authenticated USING (true);
CREATE POLICY p_partners_write ON public.partners FOR ALL TO authenticated
  USING (public.can_write_events()) WITH CHECK (public.can_write_events());

-- events: read all authenticated (archive filter in app); write by role
CREATE POLICY p_events_select ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY p_events_insert ON public.events FOR INSERT TO authenticated
  WITH CHECK (public.can_write_events());
CREATE POLICY p_events_update ON public.events FOR UPDATE TO authenticated
  USING (public.can_write_events()) WITH CHECK (public.can_write_events());
CREATE POLICY p_events_delete ON public.events FOR DELETE TO authenticated
  USING (public.is_admin());

-- child tables: read auth; write can_write_events
CREATE POLICY p_participants_select ON public.event_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY p_participants_write ON public.event_participants FOR ALL TO authenticated
  USING (public.can_write_events()) WITH CHECK (public.can_write_events());
CREATE POLICY p_goals_select ON public.event_goals FOR SELECT TO authenticated USING (true);
CREATE POLICY p_goals_write ON public.event_goals FOR ALL TO authenticated
  USING (public.can_write_events()) WITH CHECK (public.can_write_events());
CREATE POLICY p_daily_select ON public.event_daily_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY p_daily_write ON public.event_daily_reports FOR ALL TO authenticated
  USING (public.can_write_events()) WITH CHECK (public.can_write_events());
CREATE POLICY p_gallery_select ON public.event_gallery FOR SELECT TO authenticated USING (true);
CREATE POLICY p_gallery_write ON public.event_gallery FOR ALL TO authenticated
  USING (public.can_write_events()) WITH CHECK (public.can_write_events());
CREATE POLICY p_contacts_select ON public.event_contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY p_contacts_write ON public.event_contacts FOR ALL TO authenticated
  USING (public.can_write_events()) WITH CHECK (public.can_write_events());
CREATE POLICY p_partnerships_select ON public.event_partnerships FOR SELECT TO authenticated USING (true);
CREATE POLICY p_partnerships_write ON public.event_partnerships FOR ALL TO authenticated
  USING (public.can_write_events()) WITH CHECK (public.can_write_events());
CREATE POLICY p_materials_select ON public.event_materials FOR SELECT TO authenticated USING (true);
CREATE POLICY p_materials_write ON public.event_materials FOR ALL TO authenticated
  USING (public.can_write_events()) WITH CHECK (public.can_write_events());
CREATE POLICY p_follows_select ON public.event_social_follows FOR SELECT TO authenticated USING (true);
CREATE POLICY p_follows_write ON public.event_social_follows FOR ALL TO authenticated
  USING (public.can_write_events()) WITH CHECK (public.can_write_events());

-- comments: anyone authenticated writes own; edit/delete own or admin
CREATE POLICY p_comments_select ON public.event_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY p_comments_insert ON public.event_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY p_comments_update ON public.event_comments FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY p_comments_delete ON public.event_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- surveys
CREATE POLICY p_surveyq_select ON public.survey_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY p_surveyq_write ON public.survey_questions FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY p_surveys_select ON public.event_surveys FOR SELECT TO authenticated USING (true);
CREATE POLICY p_surveys_insert ON public.event_surveys FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY p_surveys_update ON public.event_surveys FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY p_surveys_delete ON public.event_surveys FOR DELETE TO authenticated
  USING (public.is_admin());

-- testimonies & conversations: read auth; write can_write_events
CREATE POLICY p_testimonies_select ON public.testimonies FOR SELECT TO authenticated USING (true);
CREATE POLICY p_testimonies_write ON public.testimonies FOR ALL TO authenticated
  USING (public.can_write_events()) WITH CHECK (public.can_write_events());
CREATE POLICY p_conversations_select ON public.conversations FOR SELECT TO authenticated USING (true);
CREATE POLICY p_conversations_write ON public.conversations FOR ALL TO authenticated
  USING (public.can_write_events()) WITH CHECK (public.can_write_events());

-- activity log: read auth (admins see all in UI); write via triggers (security definer)
CREATE POLICY p_log_select ON public.event_activity_log FOR SELECT TO authenticated USING (true);

-- settings: read auth; write admin
CREATE POLICY p_settings_select ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY p_settings_write ON public.settings FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------- Storage bucket for event gallery ----------
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-gallery', 'event-gallery', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY p_gallery_storage_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'event-gallery');
CREATE POLICY p_gallery_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-gallery' AND public.can_write_events());
CREATE POLICY p_gallery_storage_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'event-gallery' AND public.can_write_events());
CREATE POLICY p_gallery_storage_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'event-gallery' AND public.can_write_events());
