# Checkers Gym — Overhaul Status & Pending Work

Audited against `main` on 2026-10-31 by reading code. Lint/build were not run (no `node_modules` in this checkout).

Delete each pending item once done. Delete this file when the list is empty.

## Done

| Area | What is in place |
|---|---|
| Access Desk | Logs-only refresh after scan, `disabled={verifying}` on clear buttons, Enter-key guard, "Ready to scan" indicator and select refocus, RFID card self-refresh, vendor payload merge order (protected keys last), `normalizeAccessError` everywhere |
| Security | Required-field checks, confirm on override delete, audit filters, load more, debounced search |
| Blog | Fallback only when `!hasSupabase()`, title/content validation, publish confirm |
| Branches | Detail reload keyed on `selectedBranchId` |
| Reports | Start ≤ end validation, truncation notice, expense range tied to the picked dates |
| POS | Stock `max` on quantity, excessive-discount flag |
| CRM | `lost_reason` captured |
| Billing | Next-renewal uses min due date, non-negative inputs, "status is derived" helper text |
| Plans | `price > 0` enforced (page and service), bundle member picker filters `is_active` |
| Staff Tools | Commission rate 0–100, non-negative retainer |
| Notifications | Debounced search, `hasUnsavedReminderChanges` |
| Browse Exercises (section 2) | `fetchDataWithStatus` / fallback banner, `ExerciseCard` uses theme tokens |
| "Patch NN" copy (section 4) | No matches left in `src` |
| Chip colours (section 3, partial) | `getTonedChipSx` in `src/utils/statusColors.js` drives ~24 chip helpers |

## Pending

### 1. Dark mode: remaining hardcoded colours (section 3)
- [ ] ~96 uses of `background: '#fff'` render white cards in dark mode. Replace with `bgcolor: 'background.paper'`.
- [ ] ~200 uses of brand red `#ff2625` / `#df1d1d`. Replace with `primary.main` / theme hover (contained buttons already use primary).
- [ ] Other leftovers: `#fff0f0`, `#f8fafc`, `#ecfdf3`, `#047857`, `#475569`, `#fff7ed`, `#c2410c`, `#2563eb`, `#000`.
- [ ] `src/components/SearchExercises.js:99` still has `color: '#fff'`.
- Worst files: `MemberDetailPage`, `MemberProfilePage`, `StaffWorkoutProgramsPage`, `AccountPage`, `MemberWorkoutPlanPage`, `AdminPage`, `StaffToolsPage`, `StaffHomePage`, `AdminPlansPage`, `DashboardAlertsCard`, `DashboardPage`, `StaffBillingPage`, `HeroBanner`, `ExerciseVideos`.
- Also check `AttendancePage`, `ProgressTrackingPage`, `StaffProgressPage`, `BookingsPage`, `StaffBookingsPage`, `MemberAccessPassPage`, `BodyMeasurementsCard`, `PersonalRecordsCard`.

### 2. Motion layer (section 5)
- [ ] Add `framer-motion` to `package.json`.
- [ ] Create `src/theme/motion.js`: `fadeInUp`, `staggerContainer`, `cardHover`, plus a helper gated on `useReducedMotionPreference`.
- [ ] Page-transition wrapper in `AppShell` / `AppRouter` (150–200ms fade/slide).
- [ ] Shared `MotionCard` for exercise cards, gallery, plans, tools.
- [ ] Reuse `customShadows.elevated/soft` from `themeFactory.js`; no new shadow system.
- [ ] Responsive sweep: horizontal-scroll wrappers on Attendance, Reports, CRM, POS and Access log tables; add missing `xs` breakpoints on `Grid`/`Stack`.

### 3. Footer (section 6) — `src/components/layout/Footer.js`
- [ ] Trim the filler tagline.
- [ ] Replace the duplicated chip list with a social/contact icon row (placeholder hrefs, marked for you to fill in).
- [ ] Subtle scroll-in fade (uses the motion helper from item 2).
- [ ] Keep the `primaryLinks` / `workspaceLinks` / `publicSiteLinks` logic unchanged.

### 4. Public site polish (section 7)
- [ ] `ContactPage.js`: map iframe embed (reuse the `GymMapPage.js:115-123` pattern). `locationEmbedConfig.mapEmbedUrl` in `publicSiteContent.js` is still `''`, so add a clearly commented placeholder URL.
- [ ] `contactChannels` cards: title + short description by default, contact detail revealed on hover/focus via `Collapse`.
- [ ] `UtilityToolsPage.js`: one-line summary + info-icon `Tooltip`/`Popover` instead of long paragraphs; keep and tighten the medical-disclaimer `Alert`.
- [ ] Apply status/theme helpers and `MotionCard` to gallery, testimonial and event cards.
- `GymMapPage.js` stays as the deeper orientation page.

### 5. Verification as `admin@gmail.com` (section 8) — never run
- [ ] `npm install`, then `npm run lint` and `npm run build`.
- [ ] Walk in order: Access Desk (`/staff/access`), Security/audit, Blog, Branches, Reports, POS, CRM, Billing, Plans, Staff Tools, Notifications, Ops/Production Readiness, Dashboard, Blog moderation.
- [ ] Confirm each section 1 fix, no console errors, dark mode readable on each page.
- [ ] Mobile (375×812): Access Desk, Billing, public Home/Tools/Contact for overflow.
- [ ] Browse Exercises: search, fallback banner, clear-search restores the default body-part list.

### 6. Tooling and housekeeping
- [ ] `sync-architecture.sh` (root and `gsclaude/`, identical) lost earlier fixes: 598 duplicate import edges, empty Python subgraph, missing `cd` to the repo root. Re-apply, keeping the root copy (pre-commit hook and project `CLAUDE.md` call it).
- [ ] `gsclaude/.claude-session.json` is stale (lists fixed bugs as OPEN). Refresh it.
- [ ] `graphify update .` after the structural changes above.

## Constraints (from your original brief)
- Additive only: no edits to shipped SQL migrations; new files sort after the latest timestamp.
- No new props that break existing callers; keep helper call signatures.
- No unused files or code; clean, minimal diffs.
- Don't re-test repeatedly; one lint/build run plus one browser pass.
