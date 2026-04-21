# Patch 38 Integration Notes

Patch 38 focuses on shared performance and accessibility upgrades without changing the patch family boundaries introduced earlier.

## Included in this patch

- Route-level code splitting for non-home routes in `src/app/AppRouter.js`
- Shared suspense fallback in `src/app/AppShell.js`
- Skip-link and route announcer support in `src/features/accessibility/`
- Reduced-motion handling for homepage scrolling and hero autoplay
- Stronger navigation and footer semantics
- Better loading and feedback accessibility states
- Global focus-visible, screen-reader, and reduced-motion CSS utilities

## Follow-up checks

1. Verify keyboard access for navbar drawer, skip link, and footer links.
2. Verify route changes update the screen reader live region and page title.
3. Confirm lazy-loaded routes still resolve correctly behind guest/protected/staff/admin route guards.
4. Confirm the homepage hero stops auto-advancing when reduced motion is enabled.
