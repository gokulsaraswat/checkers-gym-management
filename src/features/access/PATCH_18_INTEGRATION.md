# Patch 18 integration notes

This patch is additive. It does **not** overwrite your router or navbar automatically.

## 1) Install the QR dependency

```bash
npm install react-qr-code
```

## 2) Add routes

Add these route constants to your route/path file:

```js
ACCESS_PASS: '/access-pass',
STAFF_ACCESS: '/staff/access',
ADMIN_ACCESS: '/admin/access',
```

Then mount these screens in your router:

```js
import MemberAccessPassPage from '../features/access/MemberAccessPassPage';
import StaffAccessControlPage from '../features/access/StaffAccessControlPage';
import AdminAccessControlPage from '../features/access/AdminAccessControlPage';
```

Suggested route intent:
- `/access-pass` → authenticated members, staff, and admin
- `/staff/access` → staff and admin only
- `/admin/access` → admin only

## 3) Optional navigation links

Member navigation:
- Access Pass

Staff navigation:
- Access Desk

Admin navigation:
- Access Control

## 4) Deploy functions

```bash
npx supabase functions deploy issue-access-pass
npx supabase functions deploy verify-access-pass
```

## 5) Run the SQL migration

Run:
- `supabase/migrations/20260407001900_qr_access_control_and_compliance.sql`

## 6) First-use flow

1. Admin visits `/admin/access` and confirms access points + waiver template are present.
2. Member visits `/access-pass`, accepts the active waiver, and issues a QR pass.
3. Staff visits `/staff/access` and pastes the token or scan output to verify entry.
4. Admin reviews the access logs and denial reasons.

## 7) Future extensions this patch is designed for

- hardware scanner integration
- unattended kiosk mode
- Bluetooth/RFID bridge service
- QR rotation policy
- branch-specific gate rules
- webcam scan support
