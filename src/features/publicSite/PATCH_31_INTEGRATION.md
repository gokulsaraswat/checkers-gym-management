# Patch 31 — Public Website Expansion

This patch adds a dedicated public website track after Patch 29.

## Includes
- public gallery page
- public testimonials page
- public events and competition page
- public contact and visit-planning page
- public feedback page with local draft persistence
- gym map page with optional map and 3D embed placeholders
- router and navigation links for the new public pages
- centralized seeded content file for easy migration from the old website

## Routes
- `/gallery`
- `/testimonials`
- `/events`
- `/contact`
- `/feedback`
- `/gym-map`

## Notes
- This patch is frontend-first and does not require new backend tables.
- Replace seeded copy, media URLs, and optional embed URLs in `publicSiteContent.js` when live branch content is ready.
- The feedback page currently stores drafts locally in the browser so it stays usable before CRM or support integrations are wired.
