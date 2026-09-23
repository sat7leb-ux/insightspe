-- ============================================================
-- SAT-7 INSIGHTS PORTAL — Demo events seed
-- Demo data is identifiable by names and this header comment.
-- ============================================================

-- ---------- Partners ----------
INSERT INTO public.partners (name, partner_type, country, city, contact_person, contact_email) VALUES
  ('Days of the Diocese Committee','Diocese','Lebanon','Jbeil','Fr. Maroun Azar','maroun@diocese-jbeil.org'),
  ('KKBC Church','Church','Lebanon','Beirut','Pastor Sami Khoury','sami@kkbc.org'),
  ('St. Joseph School','School','Lebanon','Beirut','Mrs. Rania Haddad','rania@stjoseph.edu.lb'),
  ('Egyptian Bible Society','NGO','Egypt','Cairo','Mr. Kamal Fahmy','kamal@ebs.org.eg'),
  ('Jordan Evangelical Council','Church','Jordan','Amman','Rev. Ibrahim Saad','ibrahim@jec.jo'),
  ('Baghdad Youth Forum','NGO','Iraq','Baghdad','Mr. Yousef Al-Bazi','yousef@byf.iq'),
  ('Istanbul Community Center','NGO','Turkey','Istanbul','Ms. Elif Kaya','elif@istcc.org'),
  ('Morocco Christian Fellowship','Church','Morocco','Casablanca','Mr. Rachid Benali','rachid@mcf.ma')
ON CONFLICT DO NOTHING;

-- ---------- Events (14) ----------
-- channel/platform ids resolved at seed time via subqueries
INSERT INTO public.events
  (name, description, start_date, end_date, city, country, partner_id, event_type, status, channel_ids, adults, children, staff_count, volunteer_count, manager_id, campaign_tag, views, unique_views, shares, comments_count, likes, platform_ids, budget, actual_cost, currency, stage)
VALUES
-- 1. Multi-day (4 days) completed
('Days of the Diocese', 'Annual diocesan festival with SAT-7 Kids programming, children activities and family screenings.',
 '2026-09-20','2026-09-23','Jbeil','Lebanon',
 (SELECT id FROM partners WHERE name='Days of the Diocese Committee'),
 'Festival / Booth','Completed',
 ARRAY[(SELECT id FROM channels WHERE slug='sat7-kids'),(SELECT id FROM channels WHERE slug='sat7-arabic')],
 850, 2400, 12, 35,
 (SELECT id FROM profiles WHERE email='eliekhachane@sat7.org'),
 '#DaysOfTheDiocese2026', 128400, 94200, 3100, 890, 12600,
 ARRAY[(SELECT id FROM platforms WHERE slug='facebook'),(SELECT id FROM platforms WHERE slug='instagram'),(SELECT id FROM platforms WHERE slug='sat7-plus')],
 6500.00, 7120.50, 'USD', 'Completed'),

-- 2. Multi-day (3 days) completed
('KKBC Follow-Up Program', 'Follow-up discipleship program with KKBC church youth after summer camp.',
 '2026-08-12','2026-08-14','Beirut','Lebanon',
 (SELECT id FROM partners WHERE name='KKBC Church'),
 'Church Partnership','Completed',
 ARRAY[(SELECT id FROM channels WHERE slug='sat7-academy')],
 210, 95, 4, 8,
 (SELECT id FROM profiles WHERE email='julianasfeir@sat7.org'),
 '#KKBCFollowUp', 18600, 12400, 420, 130, 1900,
 ARRAY[(SELECT id FROM platforms WHERE slug='facebook'),(SELECT id FROM platforms WHERE slug='instagram')],
 1200.00, 980.00, 'USD', 'Completed'),

-- 3. Single day completed
('St. Joseph School Visit', 'School assembly presentation of SAT-7 Kids programs with activity booklets.',
 '2026-09-10','2026-09-10','Beirut','Lebanon',
 (SELECT id FROM partners WHERE name='St. Joseph School'),
 'School Outreach','Completed',
 ARRAY[(SELECT id FROM channels WHERE slug='sat7-kids')],
 45, 380, 3, 6,
 (SELECT id FROM profiles WHERE email='dabirached@sat7.org'),
 '#SAT7Schools', 8200, 6100, 210, 85, 1400,
 ARRAY[(SELECT id FROM platforms WHERE slug='facebook')],
 350.00, 320.00, 'USD', 'Completed'),

-- 4. Multi-day (5 days) completed
('Cairo Book Fair Booth', 'SAT-7 booth at the Cairo International Book Fair with materials distribution and media promotion.',
 '2026-01-28','2026-02-01','Cairo','Egypt',
 (SELECT id FROM partners WHERE name='Egyptian Bible Society'),
 'Festival / Booth','Completed',
 ARRAY[(SELECT id FROM channels WHERE slug='sat7-arabic'),(SELECT id FROM channels WHERE slug='sat7-kids')],
 3200, 1900, 9, 22,
 (SELECT id FROM profiles WHERE email='akabban@sat7.org'),
 '#CairoBookFair26', 210000, 158000, 5400, 1600, 22800,
 ARRAY[(SELECT id FROM platforms WHERE slug='facebook'),(SELECT id FROM platforms WHERE slug='youtube'),(SELECT id FROM platforms WHERE slug='instagram')],
 8900.00, 9450.00, 'USD', 'Completed'),

-- 5. Multi-day (3 days) completed
('Amman Church Leaders Conference', 'Conference for church leaders on media ministry partnerships.',
 '2026-06-15','2026-06-17','Amman','Jordan',
 (SELECT id FROM partners WHERE name='Jordan Evangelical Council'),
 'Conference','Completed',
 ARRAY[(SELECT id FROM channels WHERE slug='sat7-academy'),(SELECT id FROM channels WHERE slug='sat7-arabic')],
 420, 0, 6, 11,
 (SELECT id FROM profiles WHERE email='eliekhachane@sat7.org'),
 '#AmmanConf26', 46000, 33000, 980, 340, 5200,
 ARRAY[(SELECT id FROM platforms WHERE slug='facebook'),(SELECT id FROM platforms WHERE slug='youtube')],
 5400.00, 5210.00, 'USD', 'Completed'),

-- 6. Multi-day (4 days) in progress
('Baghdad Youth Festival', 'Hybrid youth festival with live worship, SAT-7 Plus livestream and on-site workshops.',
 '2026-09-22','2026-09-25','Baghdad','Iraq',
 (SELECT id FROM partners WHERE name='Baghdad Youth Forum'),
 'Hybrid Event','In Progress',
 ARRAY[(SELECT id FROM channels WHERE slug='sat7-plus'),(SELECT id FROM channels WHERE slug='sat7-arabic')],
 610, 540, 8, 19,
 (SELECT id FROM profiles WHERE email='dabirached@sat7.org'),
 '#BaghdadFest26', 68000, 51000, 1500, 460, 8300,
 ARRAY[(SELECT id FROM platforms WHERE slug='sat7-plus'),(SELECT id FROM platforms WHERE slug='facebook'),(SELECT id FROM platforms WHERE slug='tiktok')],
 6800.00, NULL, 'USD', 'Event'),

-- 7. Single day completed
('Istanbul Refugee Outreach', 'Community outreach day for refugee families with kids activities and materials.',
 '2026-07-19','2026-07-19','Istanbul','Turkey',
 (SELECT id FROM partners WHERE name='Istanbul Community Center'),
 'Community Outreach','Completed',
 ARRAY[(SELECT id FROM channels WHERE slug='sat7-kids')],
 180, 460, 5, 14,
 (SELECT id FROM profiles WHERE email='julianasfeir@sat7.org'),
 '#IstanbulOutreach', 12400, 9800, 380, 120, 2100,
 ARRAY[(SELECT id FROM platforms WHERE slug='facebook'),(SELECT id FROM platforms WHERE slug='instagram')],
 900.00, 870.00, 'USD', 'Completed'),

-- 8. Digital campaign (14 days) completed
('Back to School Digital Campaign', 'Digital-only campaign promoting SAT-7 Kids educational content for the school year.',
 '2026-08-25','2026-09-07','','Lebanon', NULL,
 'Digital Campaign','Completed',
 ARRAY[(SELECT id FROM channels WHERE slug='sat7-kids'),(SELECT id FROM channels WHERE slug='sat7-plus')],
 0, 0, 2, 0,
 (SELECT id FROM profiles WHERE email='julianasfeir@sat7.org'),
 '#BackToSchool26', 485000, 362000, 12400, 3800, 64000,
 ARRAY[(SELECT id FROM platforms WHERE slug='facebook'),(SELECT id FROM platforms WHERE slug='instagram'),(SELECT id FROM platforms WHERE slug='tiktok'),(SELECT id FROM platforms WHERE slug='youtube')],
 3200.00, 2980.00, 'USD', 'Completed'),

-- 9. Multi-day (2 days) confirmed upcoming
('Casablanca Church Partnership Weekend', 'Weekend of church visits to launch SAT-7 Arabic programming clubs.',
 '2026-10-03','2026-10-04','Casablanca','Morocco',
 (SELECT id FROM partners WHERE name='Morocco Christian Fellowship'),
 'Church Partnership','Confirmed',
 ARRAY[(SELECT id FROM channels WHERE slug='sat7-arabic')],
 260, 80, 3, 7,
 (SELECT id FROM profiles WHERE email='akabban@sat7.org'),
 '#Casablanca26', 0, 0, 0, 0, 0,
 ARRAY[]::uuid[],
 1800.00, NULL, 'USD', 'Preparation'),

-- 10. Single day planning
('Beirut School Assembly Tour — Prep', 'Planning phase for a 5-school tour in Beirut in November.',
 '2026-11-16','2026-11-16','Beirut','Lebanon',
 (SELECT id FROM partners WHERE name='St. Joseph School'),
 'School Outreach','Planning',
 ARRAY[(SELECT id FROM channels WHERE slug='sat7-kids')],
 0, 0, 2, 4,
 (SELECT id FROM profiles WHERE email='dabirached@sat7.org'),
 '#SAT7Schools', 0, 0, 0, 0, 0,
 ARRAY[]::uuid[],
 700.00, NULL, 'USD', 'Planning'),

-- 11. Multi-day (2 days) completed
('Easter Festival Beirut', 'Easter family festival with drama, worship and SAT-7 Kids corner.',
 '2026-04-10','2026-04-11','Beirut','Lebanon',
 (SELECT id FROM partners WHERE name='KKBC Church'),
 'Festival / Booth','Completed',
 ARRAY[(SELECT id FROM channels WHERE slug='sat7-kids'),(SELECT id FROM channels WHERE slug='sat7-arabic')],
 720, 1180, 7, 26,
 (SELECT id FROM profiles WHERE email='eliekhachane@sat7.org'),
 '#EasterFest26', 96000, 71000, 2400, 720, 11200,
 ARRAY[(SELECT id FROM platforms WHERE slug='facebook'),(SELECT id FROM platforms WHERE slug='instagram'),(SELECT id FROM platforms WHERE slug='sat7-plus')],
 4200.00, 4450.00, 'USD', 'Completed'),

-- 12. Multi-day (3 days) completed
('Jbeil Summer Camp', 'Summer camp with daily SAT-7 Academy workshops for teens.',
 '2026-07-06','2026-07-08','Jbeil','Lebanon',
 (SELECT id FROM partners WHERE name='Days of the Diocese Committee'),
 'Community Outreach','Completed',
 ARRAY[(SELECT id FROM channels WHERE slug='sat7-academy')],
 150, 320, 6, 16,
 (SELECT id FROM profiles WHERE email='julianasfeir@sat7.org'),
 '#JbeilCamp26', 32000, 24000, 760, 240, 4300,
 ARRAY[(SELECT id FROM platforms WHERE slug='facebook'),(SELECT id FROM platforms WHERE slug='instagram')],
 2600.00, 2740.00, 'USD', 'Completed'),

-- 13. Single day cancelled
('Amman School Visit', 'Cancelled due to scheduling conflict with the school administration.',
 '2026-09-15','2026-09-15','Amman','Jordan',
 (SELECT id FROM partners WHERE name='Jordan Evangelical Council'),
 'School Outreach','Cancelled',
 ARRAY[(SELECT id FROM channels WHERE slug='sat7-kids')],
 0, 0, 0, 0,
 (SELECT id FROM profiles WHERE email='akabban@sat7.org'),
 '#SAT7Schools', 0, 0, 0, 0, 0,
 ARRAY[]::uuid[],
 NULL, NULL, 'USD', 'Planning'),

-- 14. Multi-day (3 days) confirmed upcoming
('GCC Media Summit', 'Regional media summit with SAT-7 Plus showcase and partner networking.',
 '2026-10-20','2026-10-22','Dubai','United Arab Emirates', NULL,
 'Conference','Confirmed',
 ARRAY[(SELECT id FROM channels WHERE slug='sat7-plus'),(SELECT id FROM channels WHERE slug='sat7-academy')],
 350, 0, 5, 9,
 (SELECT id FROM profiles WHERE email='eliekhachane@sat7.org'),
 '#GCCMedia26', 0, 0, 0, 0, 0,
 ARRAY[]::uuid[],
 9500.00, NULL, 'USD', 'Preparation');

-- ---------- Participants ----------
INSERT INTO public.event_participants (event_id, user_id, responsibility, participation_status)
SELECT e.id, p.id, 'Event Manager', 'Attended'
FROM events e, profiles p
WHERE e.name IN ('Days of the Diocese','Easter Festival Beirut','Cairo Book Fair Booth','KKBC Follow-Up Program')
  AND p.email IN ('eliekhachane@sat7.org','dabirached@sat7.org','julianasfeir@sat7.org')
ON CONFLICT DO NOTHING;

INSERT INTO public.event_participants (event_id, user_id, responsibility, participation_status)
SELECT e.id, p.id, 'Field Coordinator', 'Confirmed'
FROM events e, profiles p
WHERE e.name = 'Baghdad Youth Festival' AND p.email = 'dabirached@sat7.org'
ON CONFLICT DO NOTHING;

INSERT INTO public.event_participants (event_id, user_id, responsibility, participation_status)
SELECT e.id, p.id, 'Program Liaison', 'Confirmed'
FROM events e, profiles p
WHERE e.name IN ('Casablanca Church Partnership Weekend','GCC Media Summit') AND p.email = 'akabban@sat7.org'
ON CONFLICT DO NOTHING;

-- ---------- Goals ----------
INSERT INTO public.event_goals (event_id, goal, target, current_value, unit, deadline, responsible_id, status, notes)
SELECT e.id, 'Build relationships with 5 new churches', 5, 4, 'partnerships', '2026-10-15',
  (SELECT id FROM profiles WHERE email='eliekhachane@sat7.org'), 'On Track', 'Four MOUs signed; one pending board approval.'
FROM events e WHERE e.name='Days of the Diocese';

INSERT INTO public.event_goals (event_id, goal, target, current_value, unit, deadline, responsible_id, status, notes)
SELECT e.id, 'Reach 3,000 attendees across 4 days', 3000, 3250, 'attendees', '2026-09-23',
  (SELECT id FROM profiles WHERE email='eliekhachane@sat7.org'), 'Completed', ''
FROM events e WHERE e.name='Days of the Diocese';

INSERT INTO public.event_goals (event_id, goal, target, current_value, unit, deadline, responsible_id, status, notes)
SELECT e.id, 'Distribute 2,000 storybooks', 2000, 2100, 'books', '2026-09-23',
  (SELECT id FROM profiles WHERE email='julianasfeir@sat7.org'), 'Completed', ''
FROM events e WHERE e.name='Days of the Diocese';

INSERT INTO public.event_goals (event_id, goal, target, current_value, unit, deadline, responsible_id, status, notes)
SELECT e.id, 'Register 120 youth for discipleship track', 120, 96, 'youth', '2026-08-14',
  (SELECT id FROM profiles WHERE email='julianasfeir@sat7.org'), 'At Risk', 'Registration closed below target.'
FROM events e WHERE e.name='KKBC Follow-Up Program';

INSERT INTO public.event_goals (event_id, goal, target, current_value, unit, deadline, responsible_id, status, notes)
SELECT e.id, '1,000,000 digital views', 1000000, 68000, 'views', '2026-09-25',
  (SELECT id FROM profiles WHERE email='dabirached@sat7.org'), 'In Progress', 'Livestream day 2 of 3.'
FROM events e WHERE e.name='Baghdad Youth Festival';

INSERT INTO public.event_goals (event_id, goal, target, current_value, unit, deadline, responsible_id, status, notes)
SELECT e.id, 'Sign 3 partnership agreements', 3, 0, 'partnerships', '2026-10-04',
  (SELECT id FROM profiles WHERE email='akabban@sat7.org'), 'Not Started', ''
FROM events e WHERE e.name='Casablanca Church Partnership Weekend';

INSERT INTO public.event_goals (event_id, goal, target, current_value, unit, deadline, responsible_id, status, notes)
SELECT e.id, '500,000 campaign views', 500000, 485000, 'views', '2026-09-07',
  (SELECT id FROM profiles WHERE email='julianasfeir@sat7.org'), 'Completed', ''
FROM events e WHERE e.name='Back to School Digital Campaign';

INSERT INTO public.event_goals (event_id, goal, target, current_value, unit, deadline, responsible_id, status, notes)
SELECT e.id, 'Collect 500 contacts', 500, 412, 'contacts', '2026-02-01',
  (SELECT id FROM profiles WHERE email='akabban@sat7.org'), 'Completed', ''
FROM events e WHERE e.name='Cairo Book Fair Booth';

-- ---------- Daily reports (multi-day events) ----------
-- Days of the Diocese (Sep 20-23): 4 days
INSERT INTO public.event_daily_reports (event_id, report_date, day_number, location, staff_present, volunteers, adults, children, activities, meetings, contacts_collected, partnerships_discussed, materials_distributed, digital_engagement, problems, successes, follow_up_actions, comments, submitted_by)
SELECT e.id, d::date, ROW_NUMBER() OVER (), 'Jbeil Diocese Grounds', 12, 35, 180 + (ROW_NUMBER() OVER ())*40, 520 + (ROW_NUMBER() OVER ())*110,
 'Opening ceremony, kids corner, SAT-7 Kids screening', 'Kick-off meeting with diocese committee', 45 + (ROW_NUMBER() OVER ())*15, 2, 400 + (ROW_NUMBER() OVER ())*150,
 'Facebook live stream reached 12k viewers', 'Sound system delay in the morning', 'Excellent turnout on opening day',
 'Send thank-you letter to the diocese', 'Day ' || (ROW_NUMBER() OVER ()) || ' of 4',
 (SELECT id FROM profiles WHERE email='eliekhachane@sat7.org')
FROM events e, generate_series('2026-09-20'::date, '2026-09-23'::date, '1 day') d
WHERE e.name = 'Days of the Diocese';

-- KKBC Follow-Up (Aug 12-14): 3 days
INSERT INTO public.event_daily_reports (event_id, report_date, day_number, location, staff_present, volunteers, adults, children, activities, meetings, contacts_collected, partnerships_discussed, materials_distributed, digital_engagement, problems, successes, follow_up_actions, comments, submitted_by)
SELECT e.id, d::date, ROW_NUMBER() OVER (), 'KKBC Church Hall', 4, 8, 70, 30 + (ROW_NUMBER() OVER ())*10,
 'Discipleship workshop, small groups', 'Youth leaders debrief', 12 + (ROW_NUMBER() OVER ())*6, 1, 60 + (ROW_NUMBER() OVER ())*30,
 'Instagram stories posted daily', '', 'Strong engagement in small groups',
 'Follow up with youth leaders next week', 'Day ' || (ROW_NUMBER() OVER ()) || ' of 3',
 (SELECT id FROM profiles WHERE email='julianasfeir@sat7.org')
FROM events e, generate_series('2026-08-12'::date, '2026-08-14'::date, '1 day') d
WHERE e.name = 'KKBC Follow-Up Program';

-- Baghdad Youth Festival (Sep 22-25): 3 days so far (day 4 pending)
INSERT INTO public.event_daily_reports (event_id, report_date, day_number, location, staff_present, volunteers, adults, children, activities, meetings, contacts_collected, partnerships_discussed, materials_distributed, digital_engagement, problems, successes, follow_up_actions, comments, submitted_by)
SELECT e.id, d::date, ROW_NUMBER() OVER (), 'Baghdad Youth Forum Campus', 8, 19, 200, 170 + (ROW_NUMBER() OVER ())*20,
 'Worship night, SAT-7 Plus livestream, workshops', 'Partner huddle with BYF', 30 + (ROW_NUMBER() OVER ())*10, 1, 200 + (ROW_NUMBER() OVER ())*90,
 'Livestream concurrent viewers peaked at 3.2k', 'Venue WiFi unstable during workshop 2', 'Livestream quality praised by viewers',
 'Compile day-3 feedback survey', 'Day ' || (ROW_NUMBER() OVER ()) || ' of 4',
 (SELECT id FROM profiles WHERE email='dabirached@sat7.org')
FROM events e, generate_series('2026-09-22'::date, '2026-09-24'::date, '1 day') d
WHERE e.name = 'Baghdad Youth Festival';

-- Cairo Book Fair (Jan 28 - Feb 1): 5 days
INSERT INTO public.event_daily_reports (event_id, report_date, day_number, location, staff_present, volunteers, adults, children, activities, meetings, contacts_collected, partnerships_discussed, materials_distributed, digital_engagement, problems, successes, follow_up_actions, comments, submitted_by)
SELECT e.id, d::date, ROW_NUMBER() OVER (), 'Cairo International Book Fair — Hall 4', 9, 22, 600 + (ROW_NUMBER() OVER ())*120, 300 + (ROW_NUMBER() OVER ())*80,
 'Booth operations, materials distribution, media interviews', 'Daily partner debrief', 80 + (ROW_NUMBER() OVER ())*20, 1, 900 + (ROW_NUMBER() OVER ())*200,
 'Daily recap videos on Facebook', 'Crowd surges overwhelmed booth staff on Friday', 'Media interview on national TV',
 'Send partnership proposals to 3 schools', 'Day ' || (ROW_NUMBER() OVER ()) || ' of 5',
 (SELECT id FROM profiles WHERE email='akabban@sat7.org')
FROM events e, generate_series('2026-01-28'::date, '2026-02-01'::date, '1 day') d
WHERE e.name = 'Cairo Book Fair Booth';

-- ---------- Materials ----------
INSERT INTO public.event_materials (item, quantity, unit, notes, event_id, created_by)
SELECT 'Storybooks', 800, 'books', 'Arabic illustrated Bible stories', e.id, (SELECT id FROM auth.users WHERE email='eliekhachane@sat7.org')
FROM events e WHERE e.name='Days of the Diocese';
INSERT INTO public.event_materials (item, quantity, unit, notes, event_id, created_by)
SELECT 'Bookmarks', 1200, 'pcs', 'SAT-7 Kids branded', e.id, (SELECT id FROM auth.users WHERE email='eliekhachane@sat7.org')
FROM events e WHERE e.name='Days of the Diocese';
INSERT INTO public.event_materials (item, quantity, unit, notes, event_id, created_by)
SELECT 'Coloring Books', 400, 'books', 'For the kids corner', e.id, (SELECT id FROM auth.users WHERE email='eliekhachane@sat7.org')
FROM events e WHERE e.name='Days of the Diocese';
INSERT INTO public.event_materials (item, quantity, unit, notes, event_id, created_by)
SELECT 'Storybooks', 2500, 'books', 'Arabic + colloquial Egyptian', e.id, (SELECT id FROM auth.users WHERE email='akabban@sat7.org')
FROM events e WHERE e.name='Cairo Book Fair Booth';
INSERT INTO public.event_materials (item, quantity, unit, notes, event_id, created_by)
SELECT 'Bible Comics', 1500, 'books', 'Youth edition', e.id, (SELECT id FROM auth.users WHERE email='akabban@sat7.org')
FROM events e WHERE e.name='Cairo Book Fair Booth';
INSERT INTO public.event_materials (item, quantity, unit, notes, event_id, created_by)
SELECT 'Stress Balls', 600, 'pcs', 'SAT-7 Plus branded', e.id, (SELECT id FROM auth.users WHERE email='dabirached@sat7.org')
FROM events e WHERE e.name='Baghdad Youth Festival';
INSERT INTO public.event_materials (item, quantity, unit, notes, event_id, created_by)
SELECT 'Stickers', 900, 'sheets', 'Kids activity sheets', e.id, (SELECT id FROM auth.users WHERE email='eliekhachane@sat7.org')
FROM events e WHERE e.name='Easter Festival Beirut';
INSERT INTO public.event_materials (item, quantity, unit, notes, event_id, created_by)
SELECT 'Crayons', 300, 'boxes', 'For coloring activities', e.id, (SELECT id FROM auth.users WHERE email='julianasfeir@sat7.org')
FROM events e WHERE e.name='Jbeil Summer Camp';

-- ---------- Partnerships ----------
INSERT INTO public.event_partnerships (event_id, organization, partnership_type, country, city, contact_person, status, follow_up_date, responsible_id, notes)
SELECT e.id, 'St. Maroun Parish', 'Church', 'Lebanon', 'Jbeil', 'Fr. Maroun Azar', 'Active', '2026-10-30',
  (SELECT id FROM profiles WHERE email='eliekhachane@sat7.org'), 'MOU signed for quarterly kids events.'
FROM events e WHERE e.name='Days of the Diocese';
INSERT INTO public.event_partnerships (event_id, organization, partnership_type, country, city, contact_person, status, follow_up_date, responsible_id, notes)
SELECT e.id, 'Jbeil Evangelical Church', 'Church', 'Lebanon', 'Jbeil', 'Pastor Elie Semaan', 'Negotiation', '2026-10-10',
  (SELECT id FROM profiles WHERE email='eliekhachane@sat7.org'), 'Reviewing programming calendar.'
FROM events e WHERE e.name='Days of the Diocese';
INSERT INTO public.event_partnerships (event_id, organization, partnership_type, country, city, contact_person, status, follow_up_date, responsible_id, notes)
SELECT e.id, 'Al-Nour Private School', 'School', 'Egypt', 'Cairo', 'Mrs. Nadia Gamal', 'Contacted', '2026-10-05',
  (SELECT id FROM profiles WHERE email='akabban@sat7.org'), 'Interested in SAT-7 Academy teacher training.'
FROM events e WHERE e.name='Cairo Book Fair Booth';
INSERT INTO public.event_partnerships (event_id, organization, partnership_type, country, city, contact_person, status, follow_up_date, responsible_id, notes)
SELECT e.id, 'Baghdad Baptist Church', 'Church', 'Iraq', 'Baghdad', 'Pastor Joseph', 'Meeting', '2026-09-28',
  (SELECT id FROM profiles WHERE email='dabirached@sat7.org'), 'Meeting scheduled for after the festival.'
FROM events e WHERE e.name='Baghdad Youth Festival';
INSERT INTO public.event_partnerships (event_id, organization, partnership_type, country, city, contact_person, status, follow_up_date, responsible_id, notes)
SELECT e.id, 'Casablanca Community Church', 'Church', 'Morocco', 'Casablanca', 'Mr. Rachid Benali', 'Prospect', '2026-10-03',
  (SELECT id FROM profiles WHERE email='akabban@sat7.org'), 'First contact made via email.'
FROM events e WHERE e.name='Casablanca Church Partnership Weekend';

-- ---------- Contacts ----------
INSERT INTO public.event_contacts (event_id, name, contact_type, source, contact_date, email, phone, is_minor, parental_consent, follow_up_status, assigned_to, notes)
SELECT e.id, 'Fr. Maroun Azar', 'Church Leader', 'Days of the Diocese', '2026-09-21', 'maroun@diocese-jbeil.org', '+961 3 111 222', false, false, 'Follow-up',
  (SELECT id FROM profiles WHERE email='eliekhachane@sat7.org'), 'Wants quarterly kids events.'
FROM events e WHERE e.name='Days of the Diocese';
INSERT INTO public.event_contacts (event_id, name, contact_type, source, contact_date, email, phone, is_minor, parental_consent, follow_up_status, assigned_to, notes)
SELECT e.id, 'Mrs. Nadia Gamal', 'Teacher', 'Cairo Book Fair', '2026-01-30', 'nadia@alnour.edu.eg', '+20 100 555 7777', false, false, 'Meeting Scheduled',
  (SELECT id FROM profiles WHERE email='akabban@sat7.org'), 'Teacher training interest.'
FROM events e WHERE e.name='Cairo Book Fair Booth';
INSERT INTO public.event_contacts (event_id, name, contact_type, source, contact_date, email, phone, is_minor, parental_consent, follow_up_status, assigned_to, notes)
SELECT e.id, 'Youth Participant (name withheld)', 'Student', 'Baghdad Youth Festival', '2026-09-23', '', '', true, true, 'New',
  (SELECT id FROM profiles WHERE email='dabirached@sat7.org'), 'Minor — parental consent on file. No direct contact details exposed.'
FROM events e WHERE e.name='Baghdad Youth Festival';

-- ---------- Social follows ----------
INSERT INTO public.event_social_follows (event_id, platform, channel, follows_gained, follow_date, source_campaign)
SELECT e.id, 'Facebook', 'SAT-7 KIDS', 1850, '2026-09-23', '#DaysOfTheDiocese2026'
FROM events e WHERE e.name='Days of the Diocese';
INSERT INTO public.event_social_follows (event_id, platform, channel, follows_gained, follow_date, source_campaign)
SELECT e.id, 'Instagram', 'SAT-7 ARABIC', 940, '2026-09-23', '#DaysOfTheDiocese2026'
FROM events e WHERE e.name='Days of the Diocese';
INSERT INTO public.event_social_follows (event_id, platform, channel, follows_gained, follow_date, source_campaign)
SELECT e.id, 'TikTok', 'SAT-7 KIDS', 3200, '2026-09-07', '#BackToSchool26'
FROM events e WHERE e.name='Back to School Digital Campaign';
INSERT INTO public.event_social_follows (event_id, platform, channel, follows_gained, follow_date, source_campaign)
SELECT e.id, 'Facebook', 'SAT-7 PLUS', 610, '2026-09-24', '#BaghdadFest26'
FROM events e WHERE e.name='Baghdad Youth Festival';

-- ---------- Surveys ----------
INSERT INTO public.event_surveys (event_id, respondent_name, respondent_role, overall_experience, organization_rating, communication_rating, event_value_rating, would_participate_again, what_worked, what_to_improve, additional_comments, submitted_by)
SELECT e.id, 'Fr. Maroun Azar', 'Partner', 5, 5, 4, 5, 'Yes', 'The kids corner was exceptionally well run.', 'More Arabic signage would help.', 'Looking forward to next year.',
  (SELECT id FROM profiles WHERE email='eliekhachane@sat7.org')
FROM events e WHERE e.name='Days of the Diocese';
INSERT INTO public.event_surveys (event_id, respondent_name, respondent_role, overall_experience, organization_rating, communication_rating, event_value_rating, would_participate_again, what_worked, what_to_improve, additional_comments, submitted_by)
SELECT e.id, 'Volunteer Team Lead', 'Volunteer', 4, 4, 4, 4, 'Yes', 'Clear daily briefings.', 'Shift scheduling could be earlier.', '',
  (SELECT id FROM profiles WHERE email='eliekhachane@sat7.org')
FROM events e WHERE e.name='Days of the Diocese';
INSERT INTO public.event_surveys (event_id, respondent_name, respondent_role, overall_experience, organization_rating, communication_rating, event_value_rating, would_participate_again, what_worked, what_to_improve, additional_comments, submitted_by)
SELECT e.id, 'Mrs. Rania Haddad', 'Partner', 5, 5, 5, 5, 'Yes', 'The team was professional with the children.', '', 'Best school visit we have hosted.',
  (SELECT id FROM profiles WHERE email='dabirached@sat7.org')
FROM events e WHERE e.name='St. Joseph School Visit';
INSERT INTO public.event_surveys (event_id, respondent_name, respondent_role, overall_experience, organization_rating, communication_rating, event_value_rating, would_participate_again, what_worked, what_to_improve, additional_comments, submitted_by)
SELECT e.id, 'Pastor Sami Khoury', 'Partner', 4, 5, 3, 4, 'Maybe', 'Discipleship content was strong.', 'Communication ahead of the event was late.', '',
  (SELECT id FROM profiles WHERE email='julianasfeir@sat7.org')
FROM events e WHERE e.name='KKBC Follow-Up Program';

-- ---------- Testimonies & Conversations ----------
INSERT INTO public.testimonies (event_id, channel_id, author_name, country, summary, full_text, content_date, is_public)
SELECT e.id, (SELECT id FROM channels WHERE slug='sat7-kids'), 'Miriam (parent)', 'Lebanon',
 'My daughter asked to read the Bible every night after the festival.',
 'After attending the Days of the Diocese kids corner, my 7-year-old daughter now asks to read the illustrated Bible stories every night before bed. Thank you SAT-7 Kids!',
 '2026-09-25', true
FROM events e WHERE e.name='Days of the Diocese';
INSERT INTO public.testimonies (event_id, channel_id, author_name, country, summary, full_text, content_date, is_public)
SELECT e.id, (SELECT id FROM channels WHERE slug='sat7-academy'), 'Youth Leader', 'Iraq',
 'The Academy workshops gave our team real media skills.',
 'Our youth team learned video production basics in the Baghdad festival workshops. We already produced our first church video.',
 '2026-09-26', true
FROM events e WHERE e.name='Baghdad Youth Festival';

INSERT INTO public.conversations (event_id, channel_id, platform, person_name, country, summary, message_count, is_follow_up_required, content_date)
SELECT e.id, (SELECT id FROM channels WHERE slug='sat7-kids'), 'Facebook Messenger', 'Parent of attendee', 'Lebanon',
 'Asked where to buy the illustrated storybooks distributed at the festival.', 6, true, '2026-09-24'
FROM events e WHERE e.name='Days of the Diocese';
INSERT INTO public.conversations (event_id, channel_id, platform, person_name, country, summary, message_count, is_follow_up_required, content_date)
SELECT e.id, (SELECT id FROM channels WHERE slug='sat7-arabic'), 'WhatsApp', 'Church coordinator', 'Egypt',
 'Requested SAT-7 Arabic programming schedule for their church media room.', 3, true, '2026-02-02'
FROM events e WHERE e.name='Cairo Book Fair Booth';

-- ---------- Comments ----------
INSERT INTO public.event_comments (event_id, user_id, body)
SELECT e.id, (SELECT id FROM profiles WHERE email='eliekhachane@sat7.org'),
 'Great turnout on day 2 — over 800 attendees. The kids corner queue was managed well by volunteers.'
FROM events e WHERE e.name='Days of the Diocese';

INSERT INTO public.event_comments (event_id, user_id, body)
SELECT e.id, (SELECT id FROM profiles WHERE email='dabirached@sat7.org'),
 'Reminder: we need the day-3 report before the livestream tonight.'
FROM events e WHERE e.name='Baghdad Youth Festival';

-- ---------- Activity log entries for demo ----------
INSERT INTO public.event_activity_log (user_id, user_name, action, entity_type, entity_id, entity_name)
SELECT (SELECT id FROM profiles WHERE email='eliekhachane@sat7.org'), 'Elie Khachane', 'created', 'event', e.id, e.name
FROM events e WHERE e.name IN ('Days of the Diocese','Easter Festival Beirut','Amman Church Leaders Conference','GCC Media Summit');
INSERT INTO public.event_activity_log (user_id, user_name, action, entity_type, entity_id, entity_name)
SELECT (SELECT id FROM profiles WHERE email='dabirached@sat7.org'), 'Dany Abirached', 'created', 'event', e.id, e.name
FROM events e WHERE e.name IN ('St. Joseph School Visit','Baghdad Youth Festival','Beirut School Assembly Tour — Prep');
INSERT INTO public.event_activity_log (user_id, user_name, action, entity_type, entity_id, entity_name)
SELECT (SELECT id FROM profiles WHERE email='julianasfeir@sat7.org'), 'Juliana Sfeir', 'created', 'event', e.id, e.name
FROM events e WHERE e.name IN ('KKBC Follow-Up Program','Istanbul Refugee Outreach','Back to School Digital Campaign','Jbeil Summer Camp');
INSERT INTO public.event_activity_log (user_id, user_name, action, entity_type, entity_id, entity_name)
SELECT (SELECT id FROM profiles WHERE email='akabban@sat7.org'), 'Abdo Kabban', 'created', 'event', e.id, e.name
FROM events e WHERE e.name IN ('Cairo Book Fair Booth','Amman Church Leaders Conference','Casablanca Church Partnership Weekend','Amman School Visit');
