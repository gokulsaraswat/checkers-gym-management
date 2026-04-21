# Patch 36 - Notifications and Reminders

## Included
- reminder automation rules stored in Supabase
- seeded reminder playbooks for billing, class reminders, inactivity, and membership expiry
- staff reminder centre for editing, previewing, and manually triggering reminder batches
- preview table showing who currently matches each rule before delivery
- cooldown-aware reminder generation so the same rule does not repeatedly hit the same member record too quickly

## Files added
- `src/features/notifications/components/ReminderRuleEditorCard.js`
- `src/features/notifications/components/ReminderPreviewTable.js`
- `src/features/notifications/PATCH_36_INTEGRATION.md`
- `supabase/migrations/20260407003600_notification_reminders.sql`

## Files updated
- `src/features/notifications/StaffNotificationsPage.js`
- `src/features/notifications/notificationsHelpers.js`
- `src/services/gymService.js`
- `supabase/schema.sql`

## Notes
- the reminder centre is intentionally attached to the existing staff notifications workspace rather than a separate product track
- reminder runs create regular entries in `member_notifications`, so member inboxes and unread counts continue to work without a second notification pipeline
- default reminder rules are seeded with `on conflict do nothing`, so custom edits remain intact on later schema runs
