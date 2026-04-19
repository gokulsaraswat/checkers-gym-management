# Patch 27.2 — Raspberry Pi relay bridge

Apply this patch **after**:

- `patch_27_hotfix`
- `patch_27_device_agnostic_access_layer`
- `patch_27_1_qr_check_in_scanner_workflow`

## What this patch adds

- a relay-command queue for bridge-mode relay devices in Supabase
- claim / complete RPC functions for a Raspberry Pi bridge worker
- admin hardware page controls for queueing dry-run or live relay pulses
- scanner workflow support for automatically queueing a relay pulse after an allowed QR validation
- recent relay command visibility inside the admin hardware page

## Bridge contract

A Raspberry Pi bridge service can now:

1. authenticate with a staff-capable account
2. poll `claim_relay_bridge_commands(deviceKey, limit)`
3. execute the relay pulse locally on the Pi
4. report completion with `complete_relay_bridge_command(commandId, deviceKey, status, result)`

## Device registration notes

For a relay target to appear in the new queue UI, register the hardware device with:

- `device_type`: `relay`, `controller`, `bridge`, or `kiosk`
- `integration_mode`: `bridge`
- `relay_behavior`: any non-`none` value

Optional `config` JSON values:

- `bridgeProvider` or `bridge_provider`: `raspberry_pi`
- `relayChannel` or `relay_channel`: integer relay channel
- `defaultPulseMs` or `default_pulse_ms`: default pulse duration

## Main files

- `src/features/access/AdminAccessHardwarePage.js`
- `src/features/access/StaffAccessControlPage.js`
- `src/features/access/accessHardwareClient.js`
- `src/features/access/piRelayBridgeHelpers.js`
- `supabase/migrations/20260407002720_raspberry_pi_relay_bridge.sql`
