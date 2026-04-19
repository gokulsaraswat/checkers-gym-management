# Patch 27.0 integration notes

This patch adds the **device-agnostic access layer** that Patch 27.1, 27.2, 27.3, and 27.4 will build on.

## What this patch adds

- `/admin/access` is now mounted in the router.
- `/admin/access/hardware` is now mounted in the router.
- Admin navigation now includes **Access**.
- A new access-hardware registry lets admins register generic devices before QR, Raspberry Pi, RFID/NFC, or vendor-specific integrations are wired in.
- New database objects establish a reusable hardware abstraction layer:
  - `access_hardware_devices`
  - `access_hardware_events`
  - `get_access_hardware_snapshot(...)`
  - `list_recent_access_hardware_events(...)`
  - `log_access_hardware_heartbeat(...)`
  - `resolve_access_credential(...)`

## SQL migration

Run:

- `supabase/migrations/20260407002700_device_agnostic_access_layer.sql`

## What to do after applying

1. Open `/admin/access` and confirm access points / waiver templates still load normally.
2. Open `/admin/access/hardware`.
3. Register at least one hardware device record for the branch / gate you plan to integrate.
4. Use the heartbeat test to confirm the device health layer is working.

## Intentional scope for this patch

This patch does **not** yet implement:

- webcam or QR scanning UI
- Raspberry Pi relay code
- RFID / NFC credential verification
- vendor controller connectors

Those remain for the next sub-patches:

- **27.1** QR check-in / scanner workflow
- **27.2** Raspberry Pi relay bridge
- **27.3** RFID / NFC credentials
- **27.4** vendor controller API connector
