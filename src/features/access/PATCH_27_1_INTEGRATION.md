# Patch 27.1 — QR check-in / scanner workflow

Apply this patch **after**:

- `patch_27_hotfix`
- `patch_27_device_agnostic_access_layer`

## What this patch adds

- mounts the live staff QR scanner workflow route at `PATHS.staffAccess`
- adds a navbar entry for the staff access desk
- connects the existing QR verification flow to the new hardware layer when a QR-ready scanner device is selected
- supports raw token, JSON payload, and URL-style QR scanner input parsing
- adds admin quick-launch buttons from access control and hardware pages

## Notes

- This patch intentionally stays inside the Patch 27 access-control family.
- It does **not** add Raspberry Pi relay execution yet.
- It does **not** add RFID / NFC validation yet.
- It does **not** depend on UI/public-site redesign work.
- No new SQL migration is required for this slice because it reuses the Patch 18 QR verification layer and the Patch 27.0 hardware resolver.

## Main files

- `src/app/AppRouter.js`
- `src/app/paths.js`
- `src/components/layout/Navbar.js`
- `src/features/access/StaffAccessControlPage.js`
- `src/features/access/accessHardwareClient.js`
- `src/features/access/scannerWorkflowHelpers.js`
- `src/features/access/AdminAccessControlPage.js`
- `src/features/access/AdminAccessHardwarePage.js`
