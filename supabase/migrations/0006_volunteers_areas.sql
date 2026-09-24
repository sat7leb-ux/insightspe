-- ============================================================
-- Migration 006: volunteer names + country areas
-- ============================================================

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS volunteer_names text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.country_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL,
  area text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (country, area)
);
CREATE INDEX IF NOT EXISTS idx_country_areas_country ON public.country_areas(country);

ALTER TABLE public.country_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_country_areas_select ON public.country_areas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY p_country_areas_write ON public.country_areas
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.country_areas (country, area, sort_order) VALUES
  ('Lebanon','Beirut',1),('Lebanon','Mount Lebanon',2),('Lebanon','North Lebanon / Tripoli',3),('Lebanon','South Lebanon / Saida',4),('Lebanon','Bekaa / Zahle',5),('Lebanon','Nabatieh',6),('Lebanon','Jbeil / Byblos',7),('Lebanon','Kesrouan / Jounieh',8),('Lebanon','Aley / Chouf',9),('Lebanon','Batroun',10),
  ('Jordan','Amman',1),('Jordan','Zarqa',2),('Jordan','Irbid',3),('Jordan','Aqaba',4),('Jordan','Madaba',5),('Jordan','Karak',6),('Jordan','Jerash',7),('Jordan','Salt / Balqa',8),
  ('Egypt','Cairo',1),('Egypt','Giza',2),('Egypt','Alexandria',3),('Egypt','Luxor',4),('Egypt','Aswan',5),('Egypt','Port Said',6),('Egypt','Suez',7),('Egypt','Mansoura',8),('Egypt','Tanta',9),('Egypt','Asyut',10),('Egypt','Minya',11),
  ('Iraq','Baghdad',1),('Iraq','Erbil',2),('Iraq','Basra',3),('Iraq','Mosul',4),('Iraq','Kirkuk',5),('Iraq','Najaf',6),('Iraq','Karbala',7),('Iraq','Duhok',8),
  ('Turkey','Istanbul',1),('Turkey','Ankara',2),('Turkey','Izmir',3),('Turkey','Gaziantep',4),('Turkey','Mersin',5),('Turkey','Antalya',6),('Turkey','Bursa',7),
  ('Morocco','Casablanca',1),('Morocco','Rabat',2),('Morocco','Marrakesh',3),('Morocco','Fes',4),('Morocco','Tangier',5),('Morocco','Agadir',6),
  ('Syria','Damascus',1),('Syria','Aleppo',2),('Syria','Homs',3),('Syria','Latakia',4),
  ('United Arab Emirates','Dubai',1),('United Arab Emirates','Abu Dhabi',2),('United Arab Emirates','Sharjah',3),
  ('Kuwait','Kuwait City',1),('Saudi Arabia','Riyadh',1),('Saudi Arabia','Jeddah',2),('Tunisia','Tunis',1),('Algeria','Algiers',1),('Cyprus','Nicosia',1),('France','Paris',1),('United Kingdom','London',1)
ON CONFLICT (country, area) DO NOTHING;
