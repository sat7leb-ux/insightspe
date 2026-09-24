-- ============================================================
-- SAT-7 INSIGHTS PORTAL — Seed data (demo)
-- All demo rows are clearly identifiable via the 'Demo:' prefix
-- in event names / partner names where applicable.
-- ============================================================

-- ---------- Reference data ----------
INSERT INTO public.channels (name, slug, color, sort_order, is_active) VALUES
  ('SAT-7 KIDS', 'sat7-kids', '#f59e0b', 1, true),
  ('SAT-7 ARABIC', 'sat7-arabic', '#2563eb', 2, true),
  ('SAT-7 PLUS', 'sat7-plus', '#10b981', 3, false),
  ('SAT-7 ACADEMY', 'sat7-academy', '#8b5cf6', 4, false)
ON CONFLICT (slug) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.countries (name, code, region) VALUES
  ('Lebanon','LB','MENA'),
  ('Egypt','EG','MENA'),
  ('Jordan','JO','MENA'),
  ('Iraq','IQ','MENA'),
  ('Syria','SY','MENA'),
  ('Turkey','TR','MENA'),
  ('Morocco','MA','MENA'),
  ('Tunisia','TN','MENA'),
  ('Algeria','DZ','MENA'),
  ('Kuwait','KW','Gulf'),
  ('Saudi Arabia','SA','Gulf'),
  ('United Arab Emirates','AE','Gulf'),
  ('Qatar','QA','Gulf'),
  ('Bahrain','BH','Gulf'),
  ('Oman','OM','Gulf'),
  ('Cyprus','CY','Europe'),
  ('France','FR','Europe'),
  ('United Kingdom','GB','Europe')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.event_types (name, slug, color, sort_order) VALUES
  ('School Outreach','school-outreach','#3b82f6',1),
  ('Church Partnership','church-partnership','#8b5cf6',2),
  ('Festival / Booth','festival-booth','#f59e0b',3),
  ('Conference','conference','#ef4444',4),
  ('Digital Campaign','digital-campaign','#06b6d4',5),
  ('Community Outreach','community-outreach','#10b981',6),
  ('Hybrid Event','hybrid-event','#ec4899',7),
  ('Other','other','#64748b',8)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.platforms (name, slug, color, sort_order) VALUES
  ('Facebook','facebook','#1877f2',1),
  ('Instagram','instagram','#e4405f',2),
  ('YouTube','youtube','#ff0000',3),
  ('SAT-7 Plus','sat7-plus','#10b981',4),
  ('Website','website','#64748b',5),
  ('TikTok','tiktok','#000000',6),
  ('Other','other','#94a3b8',7)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.material_types (name, unit, sort_order) VALUES
  ('Storybooks','books',1),
  ('Bookmarks','pcs',2),
  ('Crayons','boxes',3),
  ('Coloring Books','books',4),
  ('Stress Balls','pcs',5),
  ('Stickers','sheets',6),
  ('Bible Comics','books',7)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.survey_questions (question, question_type, sort_order) VALUES
  ('Overall experience','rating',1),
  ('Organization','rating',2),
  ('Communication','rating',3),
  ('Event value','rating',4),
  ('Would you participate again?','yes_no_maybe',5),
  ('What worked well?','text',6),
  ('What could be improved?','text',7),
  ('Additional comments','text',8)
ON CONFLICT DO NOTHING;

INSERT INTO public.settings (key, value) VALUES
  ('org', '{"name": "SAT-7", "app_name": "SAT-7 Insights Portal", "tagline": "Public Engagement & Channel Performance"}'),
  ('password_policy', '{"min_length": 8, "require_upper": true, "require_number": true}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ---------- Admin role assignment ----------
-- eliekhachane@sat7.org = super_admin
UPDATE public.profiles SET
  role = 'super_admin',
  full_name = 'Elie Khachane',
  dept = 'Communications',
  can_view_financials = true,
  is_active = true
WHERE email = 'eliekhachane@sat7.org';

-- Give the other existing sat7.org accounts sensible demo roles
UPDATE public.profiles SET role = 'admin', full_name = 'Dany Abirached', dept = 'Communications', can_view_financials = true WHERE email = 'dabirached@sat7.org';
UPDATE public.profiles SET role = 'manager', full_name = 'Abdo Kabban', dept = 'Programming' WHERE email = 'akabban@sat7.org';
UPDATE public.profiles SET role = 'viewer', full_name = 'Guest User', dept = '' WHERE email = 'sat7guest@sat7.org';
UPDATE public.profiles SET role = 'contributor', full_name = 'Juliana Sfeir', dept = 'Marketing' WHERE email = 'julianasfeir@sat7.org';
