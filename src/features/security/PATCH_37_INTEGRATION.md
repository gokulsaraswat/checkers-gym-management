# Patch 37 integration notes

This patch assumes the earlier security schema from Patch 20 already exists.

## What this patch wires automatically

- adds `/admin/security` to the admin route group
- adds `/security/restricted` as the shared restriction landing page
- hardens `ProtectedRoute`, `StaffRoute`, and `AdminRoute` against:
  - `require_password_reset`
  - `member_portal_access`
  - `staff_portal_access`
  - `admin_portal_access`
  - role-level `permission_overrides`

## Database step

Run:

```text
supabase/migrations/20260407003700_security_hardening_and_audit_logs.sql
```

## Recommended follow-up

- add a visible admin shortcut to `/admin/security`
- review existing `permission_overrides` keys and align them with the new route keys such as:
  - `admin.reports`
  - `admin.finance`
  - `staff.access`
  - `member.billing`
- test one allow flow and one deny flow for member, staff, and admin accounts

## Audit logging added by this patch

The route guards now write best-effort security audit events for:

- forced password-reset blocks
- portal lockout blocks
- permission-override denials

These events use the new `log_security_event(...)` RPC and appear in the existing security audit stream.
