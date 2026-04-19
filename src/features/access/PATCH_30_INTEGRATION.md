# Patch 30 — stabilization, UX polish, bug cleanup

This patch is intended to be applied **after** the Patch 27 access-control family, including:

- `patch_27_hotfix`
- `patch_27_device_agnostic_access_layer`
- `patch_27_1_qr_check_in_scanner_workflow`
- `patch_27_2_raspberry_pi_relay_bridge`
- `patch_27_3_rfid_nfc_credentials`
- `patch_27_4_vendor_controller_api_connector`

## Scope

This stabilization pass focuses on making the new access-control workflows safer and easier to operate before larger UI/public-site work continues.

Included improvements:

- shared access-runtime helpers for safer error handling and workflow preference persistence
- duplicate-scan protection for QR and RFID/NFC console flows to reduce accidental double approvals
- persisted operator preferences for selected devices, access points, relay settings, and console toggles
- refresh timestamps and manual refresh actions on key access-control admin/operator surfaces
- safer vendor-controller command validation before queueing unlock/lock/grant requests
- normalized RFID/NFC credential enrollment values before registry saves
- small admin access-control validation and refresh polish

## Notes

- This patch intentionally stays on the stabilization track and does **not** mix in Patch 28 UI redesign work.
- No global ESLint suppression is introduced here.
- No hardware-vendor-specific secret values are embedded in the bundle.
