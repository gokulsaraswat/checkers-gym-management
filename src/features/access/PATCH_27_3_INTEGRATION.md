# Patch 27.3 — RFID / NFC credentials

Apply this bundle **after**:

- `patch_27_hotfix`
- `patch_27_device_agnostic_access_layer`
- `patch_27_1_qr_check_in_scanner_workflow`
- `patch_27_2_raspberry_pi_relay_bridge`

## Scope

This patch adds the RFID / NFC credential slice inside Patch 27:

- Supabase-backed registry for UID-based member credentials
- admin credential enrollment + revoke workflow inside the access hardware page
- staff-facing RFID / NFC validation console with optional relay queueing
- reader-device detection helpers and credential-resolution client functions
- access resolver support for RFID / NFC credentials through the Patch 27.0 hardware layer

## Included files

See `patch_27_3_rfid_nfc_credentials_files.txt`.

## Notes

- This patch stays inside the Patch 27 hardware/access track.
- It does not mix in Patch 28+ UI/public-site redesign work.
- UID enrollment is scoped to admin users.
- Staff can validate enrolled credentials and view recent credential mappings.
- Vendor controller adapters remain part of Patch 27.4.
