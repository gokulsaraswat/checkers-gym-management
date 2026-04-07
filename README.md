# Checkers Gym Management App

This project upgrades the original Checkers Gym React site into a **Gym Management App starter** with:

- Supabase authentication (email + password)
- Member dashboard with membership plan details
- Membership profile page with lifecycle dates, emergency contacts, and waiver acknowledgement
- Workout tracking (create, edit, delete logs)
- Admin panel for plans, members, lifecycle tracking, and waivers
- Optional live exercise explorer powered by RapidAPI
- Demo exercise fallback when no RapidAPI key is configured

## Stack

- React 18
- React Router 6
- Material UI
- Supabase (`@supabase/supabase-js`)

## What is included

### Frontend
- Public landing page
- Login / signup page
- Forgot password and reset password flow
- Protected member dashboard
- Account settings page
- Membership profile page
- Protected staff-ready route foundation
- Protected admin page
- Admin member detail lifecycle editor
- Workout tracking UI
- Exercise explorer with graceful fallback sample data

### Supabase assets
- `supabase/schema.sql` for database tables, RLS policies, and triggers
- `supabase/functions/admin-members/index.ts` for secure admin add/remove member actions

## 1) Install dependencies

```bash
npm install
```

## 2) Create a Supabase project

Create a free Supabase project from the dashboard.

## 3) Run the SQL schema

Open the **SQL Editor** in Supabase and run:

- `supabase/schema.sql`

This creates:

- `profiles`
- `membership_plans`
- `workouts`
- `membership_status_history`
- `member_waivers`

It also enables Row Level Security and creates the trigger that inserts a profile row whenever a new auth user is created.

## 4) Add your environment variables

Create a `.env` file in the project root.

```env
REACT_APP_SUPABASE_URL=your_project_url
REACT_APP_SUPABASE_PUBLISHABLE_KEY=your_publishable_or_anon_key
REACT_APP_RAPID_API_KEY=optional
ESLINT_NO_DEV_ERRORS=true
```

Notes:

- `REACT_APP_RAPID_API_KEY` is optional. Without it, the app uses demo exercise data.
- If your Supabase project still shows an anon key instead of a publishable key, you can use `REACT_APP_SUPABASE_ANON_KEY`.

## 5) Add auth redirect URLs in Supabase

In Supabase Dashboard → **Authentication** → **URL Configuration**:

- Set the **Site URL** to your local or production app URL.
- Add `http://localhost:3000/reset-password` to the **Redirect URLs** list for local development.
- Add your production reset route too, for example `https://your-domain.com/reset-password`.

## 6) Create your first admin user

1. Start the app with `npm start`
2. Sign up for a normal account from `/auth`
3. In Supabase SQL Editor, promote that account to admin:

```sql
update public.profiles
set role = 'admin'
where email = 'your-admin-email@example.com';
```

Refresh the app. You should now see the **Admin** page in the navigation.

## 7) Deploy the admin edge function

The admin UI uses an Edge Function for **create member** and **remove member** actions because auth admin methods require the service role and must not run in the browser.

You can deploy it with either:

- the Supabase Dashboard Edge Functions editor, or
- the Supabase CLI

Function source file:

- `supabase/functions/admin-members/index.ts`

Recommended function name:

- `admin-members`

After deployment, the frontend will call it through `supabase.functions.invoke('admin-members')`.

## 8) Run locally

```bash
npm start
```

## Admin features

### Members
- Create member, staff, or admin accounts with initial lifecycle dates
- Assign or remove plans from the roster or member detail page
- Change role between member/staff/admin
- Track membership status (`trial`, `active`, `suspended`, `expired`, `cancelled`)
- Activate/deactivate profiles
- Review lifecycle dates, waiver state, and recent admin activity from the roster
- Open a dedicated member detail page for emergency contacts, membership history, waiver records, and internal notes
- Suspend, reactivate, or expire members quickly
- Remove members

### Plans
- Create plans
- Edit plans
- Delete plans
- Filter the roster by plan assignment

## Workout tracking

Members can:

- add workout logs
- attach multiple exercise entries to each workout
- edit past workouts
- delete workouts

Each workout stores:

- title
- workout date
- status
- notes
- exercise entry list (`exercise_name`, `sets`, `reps`, `weight`)

## Authentication and account flow

The app now also includes:

- forgot password email flow
- reset password page
- account settings page
- member/staff/admin-aware post-login routing
- staff role support in the admin create-member flow

## Folder guide

```text
src/
  app/
    config/
  components/
    common/
    layout/
  context/
  data/
  features/
    account/
    admin/
    auth/
    dashboard/
    exercises/
    staff/
  lib/
  routes/
  services/
```

## Foundation conventions

Phase 0 establishes a few project rules that later patches should follow:

- Centralize route strings in `src/app/paths.js`
- Keep app-wide providers and router setup in `src/app/`
- Treat `supabase/migrations/` as the database source of truth
- Use `npm run lint` before moving to the next patch
- Remove dead duplicate files instead of keeping parallel versions around

## Important security note

Do **not** put the Supabase service role key in the React app. The included Edge Function is the safe place for admin-only user creation and deletion.

## Optional live exercise API

If you want the original exercise search experience to use live data, add:

```env
REACT_APP_RAPID_API_KEY=your_rapidapi_key
```

Without it, the UI still works with sample exercises so the gym management flow can be tested immediately.


## Member lifecycle and waivers

Phase 2 adds:

- richer member profile fields (`phone`, `address`, `date_of_birth`, emergency contacts, fitness goals)
- membership lifecycle fields (`membership_status`, `membership_start_date`, `membership_end_date`, `next_billing_date`)
- digital liability waiver acknowledgement tracking
- member-facing `/membership` page
- admin `/admin/members/:memberId` detail page

If you already applied Phase 1 to a live project, also run:

- `supabase/migrations/20260407000300_member_profiles_and_membership_lifecycle.sql`

## New routes

- `/membership` — member self-service profile and waiver page
- `/admin/members/:memberId` — admin member lifecycle detail page


## Dashboard 2.0

Phase 3 adds a richer member dashboard with real data sections for:

- membership status and renewal visibility
- alert center for renewals, missing waiver/profile info, and recent activity gaps
- progress snapshots (`public.progress_checkpoints`)
- upcoming class bookings (`public.class_bookings` + `public.class_sessions`)
- planned workout summary built from saved workout logs

If you already applied Phase 2 to a live project, also run:

- `supabase/migrations/20260407000400_dashboard_v2.sql`

## Dashboard notes

This patch keeps workout tracking on the dashboard, but adds more structure around it:

- quick body-metric logging
- upcoming class cards when bookings exist
- profile completeness scoring
- membership and billing reminders

Dedicated attendance scans, QR check-ins, and full class management still belong to later patches.

## Admin panel 2.0

Phase 4 upgrades the admin area into a fuller operations workspace with:

- roster search, filters, and sorting
- inline role / plan / status / access updates
- quick suspend, reactivate, and expire actions
- recent admin activity logging (`public.admin_activity_log`)
- internal admin/staff notes (`public.member_notes`)
- reason-aware member updates through `public.admin_update_member_record(...)`

If you already applied Phase 3 to a live project, also run:

- `supabase/migrations/20260407000500_admin_panel_fully_functional.sql`

## Admin patch notes

This patch is intentionally still pre-attendance and pre-billing. It focuses on day-to-day member operations first:

- admin-side context and auditability
- safer lifecycle edits
- better staff/admin visibility
- richer member detail workflows
