# Patch 22 integration notes

This patch is additive and does **not** auto-edit your router or navbar.

## Suggested admin route

Add an admin-only route like:

```jsx
<Route path="/admin/automations" element={<AdminAutomationsPage />} />
```

Import from:

```js
import AdminAutomationsPage from './features/automations/AdminAutomationsPage';
```

## Suggested nav entry

Add a sidebar or navbar entry in your admin navigation group:

- Label: `Automations`
- Path: `/admin/automations`

## Recommended order after wiring

1. Run migration `20260407002300_automations_monitoring_and_backups.sql`
2. Deploy:
   - `run-renewal-reminders`
   - `run-daily-ops-summary`
   - `public-health-check --no-verify-jwt`
3. Visit `/admin/automations`
4. Create or update at least one backup policy
5. Configure an external scheduler or Supabase scheduled invocation for the renewal reminder job
6. Point your uptime monitor to:
   - `https://YOUR_PROJECT_ID.supabase.co/functions/v1/public-health-check`

## Notes

- This patch does not remove any existing ops/release pages from Patch 21.
- It is safe to place this page under the existing admin operations/release section if you prefer.
