# Patch 20 integration notes

This patch is intentionally additive. It does **not** edit your router or navigation automatically.

## 1) Wire the admin security route

Add the import in your main router file (commonly `src/App.js`):

```js
import AdminSecurityPage from './features/security/AdminSecurityPage';
```

Then add the admin route inside your existing `<AdminRoute />` group:

```jsx
<Route element={<AdminRoute />}>
  <Route path="/admin" element={<AdminPage />} />
  <Route path="/admin/security" element={<AdminSecurityPage />} />
</Route>
```

## 2) Add a quick link from the admin workspace

Recommended label:

- **Security center**

Recommended route:

- `/admin/security`

## 3) Run the SQL migration

Run:

```text
supabase/migrations/20260407002100_security_permissions_and_audit_logs.sql
```

## 4) Notes for later patches

This patch stores security flags and role override rules, but it does **not** force those flags into every page guard yet.

The next security-hardening step can use:

- `user_security_flags`
- `permission_overrides`
- `audit_log_events`

to enforce route-level restrictions and stronger admin approvals.
