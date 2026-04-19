# Patch 27.4 — vendor controller API connector

Apply this bundle **after**:

- `patch_27_hotfix`
- `patch_27_device_agnostic_access_layer`
- `patch_27_1_qr_check_in_scanner_workflow`
- `patch_27_2_raspberry_pi_relay_bridge`
- `patch_27_3_rfid_nfc_credentials`

## Scope

This patch adds the vendor-controller connector slice inside Patch 27:

- queued vendor controller command feed for SDK, webhook, and polling-based adapters
- admin tools for previewing and queueing unlock, sync, lock, and refresh commands
- helper utilities for provider labels, payload shaping, and connector previews
- claim/complete/list Supabase RPCs for external connector workers that translate queued work into vendor API calls
- snapshot metrics for vendor-ready devices and pending connector actions

## Included files

See `patch_27_4_vendor_controller_api_connector_files.txt`.

## Notes

- This patch stays inside the Patch 27 hardware/access track.
- It does not mix in Patch 28+ UI/public-site redesign work.
- The generic access layer still owns the access decision, while vendor adapters handle the downstream open/lock/sync call.
- Raspberry Pi relay bridge support from Patch 27.2 remains unchanged.
