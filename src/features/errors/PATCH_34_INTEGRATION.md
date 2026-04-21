# Patch 34 - Error Handling and Fallback Pages

This bundle continues from Patch 33 and adds safer UI behavior for missing routes and runtime failures.

## Includes
- dedicated `/404` page instead of redirecting unknown routes back to home
- reusable `ErrorStatePanel` component for consistent failure messaging
- route-level `AppErrorBoundary` with a recoverable fallback screen
- safer retry and reload actions for runtime render failures

## Apply
Copy the files from `overlay/` into the project root after Patch 33 is already applied.

## Notes
- This patch is frontend-only and does not require database changes.
- The route fallback keeps the app responsive when a screen fails to render.
- In production, technical error details stay hidden while recovery actions remain visible.
