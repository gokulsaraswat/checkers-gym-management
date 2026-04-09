# Patch 22 — Supabase setup checklist

## Run migration

```bash
supabase db push
```

Or run manually in the SQL editor:

```text
supabase/migrations/20260407002300_automations_monitoring_and_backups.sql
```

## Deploy functions

```bash
npx supabase functions deploy run-renewal-reminders
npx supabase functions deploy run-daily-ops-summary
npx supabase functions deploy public-health-check --no-verify-jwt
```

## Optional secrets

```bash
npx supabase secrets set APP_BASE_URL=https://YOUR_APP_DOMAIN
npx supabase secrets set OPS_ALERT_EMAIL=ops@example.com
```

## Recommended external wiring

- Configure an uptime monitor to call:
  - `https://YOUR_PROJECT_ID.supabase.co/functions/v1/public-health-check`
- Configure a scheduler to invoke:
  - `run-renewal-reminders`
  - `run-daily-ops-summary`

## Suggested schedules

- `run-renewal-reminders` — every morning
- `run-daily-ops-summary` — every evening
- `public-health-check` — every 5 minutes from your uptime tool
