# SAT-7 Insights Portal — Public Engagement Module

A production-ready analytics platform for SAT-7 that unifies **offline and hybrid public engagement** (church partnerships, school visits, festivals, conferences, campaigns, community outreach) with **digital channel performance**.

**Live:** https://insightspe.vercel.app

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript, React 19) |
| Styling | Tailwind CSS v4 + custom design tokens |
| Charts | Chart.js via react-chartjs-2 |
| Icons | Lucide React |
| Database & Auth | Supabase (PostgreSQL, RLS, Auth, Storage, Edge Functions) |
| Hosting | Vercel |
| PWA | Installable web app (manifest + theme) |

## Features

- **Authentication** — sign in / sign up / forgot password / reset password, session persistence, protected routes, role-based access
- **Roles & Permissions** — Super Admin, Admin, Manager, Event Manager, Contributor, Viewer (+ `Can View Financial Information` permission), enforced by PostgreSQL Row Level Security
- **Event Management** — create, edit, duplicate, archive, delete; multi-day events; statuses (Planning → Confirmed → In Progress → Completed → Cancelled → Archived); channels (SAT-7 KIDS / ARABIC / PLUS / ACADEMY); partners; field team; campaign tags
- **Goals / Pipeline** — per-event goals with targets, current value, deadline, responsible user, status, progress bars
- **Multi-day Daily Reports** — a report row per day of a multi-day event (attendance, activities, meetings, contacts, problems, successes, follow-ups)
- **Event Gallery** — drag-and-drop uploads to Supabase Storage, captions, featured image, lightbox with keyboard navigation
- **Reach & Engagement** — views, unique views, shares, comments, likes, platforms, campaign tags, social follows
- **Leads & Contacts** — follow-up statuses, assignment, parental-consent enforcement for minors
- **Partnerships** — pipeline: Prospect → Contacted → Meeting → Negotiation → Active → Follow-up → Closed
- **Materials** — items, quantities, rollups by event / country
- **Surveys** — 4 ratings + would-participate-again + free text; aggregated results with distributions
- **Testimonies & Conversations** — linked to events as references (no duplication)
- **Comments** — threaded discussion with @mentions
- **Calendar** — month / week / list views with status colors
- **Dashboard & Analytics** — 15+ KPI cards, interactive charts, filters across country / type / partner / channel / status / manager / campaign / date range
- **Global Search** — Ctrl+K command palette (events, partners, users, campaigns)
- **CSV Exports** — events, attendance, materials, partnerships, surveys, analytics, users
- **Audit Log** — event created/updated tracked automatically via triggers
- **Accessibility** — keyboard navigation, ARIA labels, focus states, semantic tables
- **Responsive** — desktop, laptop, tablet and mobile layouts (tables become cards on mobile)

## Project Structure

```
src/
  app/
    (auth)/          login, signup, forgot-password, reset-password
    (app)/           dashboard, public-engagement, events, events/[id], calendar,
                     daily-reports, gallery, surveys, users, analytics, goals,
                     materials, testimonies, conversations, reports, settings
    layout.tsx, not-found.tsx, page.tsx
  components/
    layout/          AppShell, CommandPalette
    ui/              primitives, charts, modal, toast
    dashboard/ events/ calendar/ users/ analytics/ goals/ materials/
    daily-reports/ gallery/ testimonies/ conversations/ surveys/ reports/ settings/
  lib/
    supabase/        client.ts (browser), server.ts (cookies), admin.ts (service role)
    types.ts         domain types + permissions
    queries.ts       server-side data access (all wrapped in safe())
    analytics.ts     KPI + chart computations
    auth.ts          getCurrentUser / requireUser / requireRole
    utils.ts         formatting, CSV, helpers
supabase/
  migrations/        0001_schema.sql, 0002_rls.sql
  seed.sql           reference data + roles
  seed_events.sql    demo events + child data
  functions/         admin-users edge function
```

## Environment Variables

Copy `.env.example` to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon or publishable key>
```

Both values are public by design — access control is enforced by Row Level Security. The service role key is **never** exposed to the browser; admin user management runs through the `admin-users` Edge Function which verifies the caller's role server-side.

## Local Development

```bash
npm install
npm run dev        # http://localhost:3000
```

## Supabase Setup (fresh project)

1. Create a project at supabase.com.
2. SQL Editor → run `supabase/migrations/0001_schema.sql` (tables, indexes, constraints).
3. SQL Editor → run `supabase/migrations/0002_rls.sql` (helper functions, triggers, RLS policies, storage bucket).
4. SQL Editor → run `supabase/seed.sql` (channels, countries, event types, platforms, material types, survey questions, settings, role assignments).
5. SQL Editor → run `supabase/seed_events.sql` (14 demo events with reports, goals, materials, partnerships, contacts, surveys, testimonies, conversations).
6. Authentication → Providers → Email: enable Sign Up (or disable after seeding to lock registration).
7. Create the initial admin account via **Authentication → Add user** (email + password, auto-confirm), then run:
   ```sql
   UPDATE profiles SET role='super_admin', can_view_financials=true WHERE email='<admin email>';
   ```
   The `handle_new_user` trigger auto-creates the profile row on signup.
8. Deploy the edge function (or via dashboard → Edge Functions → new function `admin-users` with the content of `supabase/functions/admin-users/index.ts`).

## Deploying to Vercel

1. Push this repository to GitHub.
2. Vercel → New Project → import the repo (framework auto-detects Next.js).
3. Add environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Production + Preview).
4. Deploy. The production URL is `https://insightspe.vercel.app`.

## Security Notes

- All tables have RLS enabled; write access requires `can_write_events()` / `is_admin()` roles at the **database** level.
- Financial columns (budget, actual_cost) are only rendered for users with the financial permission — enforced in the UI layer and never included in CSV exports for unauthorized users.
- Contacts under 18 require parental consent before insert (validated in the UI and auditable in the data model).
- Storage bucket `event-gallery` is public-read, authenticated-write gated by `can_write_events()`.
- No secrets in the client bundle; the admin edge function authenticates the caller before using the service role.
- **No social media passwords are ever stored.** Platforms are linked by URL + campaign tag only. YouTube metrics are fetched server-side with an API key (public data only).

## Social Media Integration

The Social Media section (sidebar) links SAT-7's social accounts to events:

- **Accounts registry** — add each account once (platform, handle, followers, URL, SAT-7 channel), then link it to any events
- **Posts** — record each post with its URL, type, campaign tag, metrics and linked event
- **YouTube auto-sync (optional)** — set `YOUTUBE_API_KEY` and pasting a YouTube URL auto-fills the title, date, views, likes and comments. A "Sync" button on saved YouTube posts refreshes the metrics. Setup:
  1. Google Cloud Console → create (or pick) a project
  2. APIs & Services → Library → enable **YouTube Data API v3**
  3. APIs & Services → Credentials → **Create credentials → API key**
  4. Add it as `YOUTUBE_API_KEY` in Vercel → Project → Settings → Environment Variables (Production + Preview)
- **Facebook / Instagram / TikTok** — manual entry (their APIs require OAuth apps and business verification; the schema's `external_id` columns are ready if you add OAuth later)

## Demo Data

The seed creates 14 demo events across Lebanon, Egypt, Jordan, Iraq, Turkey, Morocco and the UAE — including multi-day events with daily reports, goals, materials, partnerships, contacts (incl. a consented minor), surveys, testimonies and conversations. Clear demo data with:

```sql
DELETE FROM events;            -- cascades to all child tables
DELETE FROM partners;
```

## Testing Checklist

- [ ] Sign up creates a Contributor account and profile row
- [ ] Sign in / sign out / session persistence works
- [ ] Forgot password sends a reset email; reset flow updates the password
- [ ] Roles: Viewer cannot see Users nav; Contributor can create events; only Admin+ can archive/delete
- [ ] Multi-day event shows a Daily Reports tab with one row per day
- [ ] Gallery upload (drag & drop) stores in Supabase Storage and renders with lightbox
- [ ] Goals show progress bars and status badges
- [ ] Survey submission appears in aggregated results
- [ ] Comments support replies and @mentions
- [ ] Ctrl+K global search finds events/partners/users/campaigns
- [ ] CSV exports download for each report type
- [ ] Calendar month/week/list views navigate correctly
- [ ] Mobile layout: sidebar drawer, tables become cards
