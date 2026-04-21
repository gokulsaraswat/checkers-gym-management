# Patch 39 integration notes

Patch 39 expands the admin operations workspace into a single surface for **backup policies**, **export queue tracking**, **health checks**, and **ops follow-up**.

## Files added or updated

- `src/features/ops/AdminOperationsPage.js`
- `src/features/ops/opsClient.js`
- `src/features/ops/opsHelpers.js`
- `src/features/ops/components/OpsExportQueuePanel.js`
- `src/features/ops/components/OpsBackupPanel.js`
- `src/features/ops/components/OpsHealthPanel.js`
- `src/app/AppRouter.js`
- `src/app/paths.js`
- `src/components/layout/Navbar.js`
- `supabase/migrations/20260421003900_backup_export_ops_tools.sql`

## Route wiring

This patch wires the admin route directly through the updated router.

Suggested route:

```text
/admin/ops
```

The navbar also gets an **Ops** entry for admins.

## Required Supabase step

Run:

```text
supabase/migrations/20260421003900_backup_export_ops_tools.sql
```

## What this patch gives you

- queue-first export center backed by `ops_export_jobs`
- backup policy and run-log tracking
- scheduled job history and system health summaries
- one admin ops page for checklist, incidents, release notes, exports, and backup tooling
- idempotent seed function for default backup policies, jobs, and health checks

## Important note about exports and backups

This patch focuses on the **operator tooling layer**.

- Export jobs are queued and tracked in the app.
- Backup policies and verification runs are logged in the app.
- You still need a real worker, Edge Function, or external job runner if you want automatic file generation or infrastructure-level backups.

## Safe checks after applying

1. Run the migration.
2. Open `/admin/ops` as an admin.
3. Click **Seed defaults** once.
4. Queue one preset export.
5. Save or edit a backup policy.
6. Log a backup success on one policy.
7. Confirm the health and job tables render without crashing.
