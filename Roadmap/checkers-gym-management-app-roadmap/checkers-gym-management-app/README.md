# Checkers Gym Management App

This project upgrades the original Checkers Gym React site into a **Gym Management App starter** with:

- Supabase authentication (email + password)
- Member dashboard with membership plan details
- Workout tracking (create, edit, delete logs)
- Admin panel for plans and members
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
- Protected member dashboard
- Protected admin page
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

## 5) Create your first admin user

1. Start the app with `npm start`
2. Sign up for a normal account from `/auth`
3. In Supabase SQL Editor, promote that account to admin:

```sql
update public.profiles
set role = 'admin'
where email = 'your-admin-email@example.com';
```

Refresh the app. You should now see the **Admin** page in the navigation.

## 6) Deploy the admin edge function

The admin UI uses an Edge Function for **create member** and **remove member** actions because auth admin methods require the service role and must not run in the browser.

You can deploy it with either:

- the Supabase Dashboard Edge Functions editor, or
- the Supabase CLI

Function source file:

- `supabase/functions/admin-members/index.ts`

Recommended function name:

- `admin-members`

After deployment, the frontend will call it through `supabase.functions.invoke('admin-members')`.

## 7) Run locally

```bash
npm start
```

## Admin features

### Members
- Create member accounts
- Assign a membership plan
- Change role between member/admin
- Activate/deactivate profiles
- Remove members

### Plans
- Create plans
- Edit plans
- Delete plans

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

## Folder guide

```text
src/
  components/
    common/
    layout/
  context/
  data/
  features/
    admin/
    auth/
    dashboard/
    exercises/
  lib/
  routes/
  services/
```

## Important security note

Do **not** put the Supabase service role key in the React app. The included Edge Function is the safe place for admin-only user creation and deletion.

## Optional live exercise API

If you want the original exercise search experience to use live data, add:

```env
REACT_APP_RAPID_API_KEY=your_rapidapi_key
```

Without it, the UI still works with sample exercises so the gym management flow can be tested immediately.


## Product roadmap docs

For the full phased build plan and agent workflow, read:

- `IMPLEMENTATION_README.md`
- `docs/AGENT_HANDOFF.md`

These documents explain the long-term roadmap from the current starter into a complete gym management platform, including auth hardening, member lifecycle, attendance, scheduling, bookings, billing, trainer tools, CRM, POS, analytics, and launch readiness.
