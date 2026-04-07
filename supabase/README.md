
# Supabase assets

## Source of truth
- `supabase/migrations/*` is the source of truth for database changes.
- `supabase/schema.sql` is the bootstrap snapshot for quick setup in the Supabase SQL Editor.

## Database
For a fast remote setup, run `schema.sql` in the Supabase SQL Editor.

For tracked changes going forward:
1. Create a new SQL migration inside `supabase/migrations/`
2. Apply it locally with the Supabase CLI when available
3. Push it to the remote project

## Phase 2 notes
This phase adds:
- richer member profile fields on `public.profiles`
- membership lifecycle dates and status tracking
- `public.membership_status_history` for lifecycle snapshots
- `public.member_waivers` for digital liability acknowledgement records
- `public.update_my_member_profile()` for self-service profile updates
- `public.sign_current_liability_waiver()` for member waiver acknowledgement

After this patch, apply:
- `supabase/migrations/20260407000300_member_profiles_and_membership_lifecycle.sql`

## Auth configuration
In Supabase Dashboard → Authentication → URL Configuration:
- keep your Site URL aligned with the deployed app URL
- add `http://localhost:3000/reset-password` during local development
- add your production `/reset-password` URL too

## Edge Function
Deploy `functions/admin-members/index.ts` as a function named `admin-members`.

The React admin page invokes it with:

```js
supabase.functions.invoke('admin-members')
```

Use either:
- Supabase Dashboard > Edge Functions
- Supabase CLI
