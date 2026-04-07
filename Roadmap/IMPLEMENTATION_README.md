# Gym Management App - Master Implementation README

This file is the **source of truth** for building the app from the current starter into a production-grade gym management platform.

It is written for:
- the project owner
- future coding agents
- collaborators joining mid-build

## 1. Product vision

Build a modern gym management platform using **free-tier friendly tools** first, while keeping the architecture ready for paid services later when the business grows.

### Core goals
1. Help gym owners manage members, plans, staff, schedules, payments, attendance, and business performance.
2. Help members handle bookings, workouts, progress, renewals, and communication from one app.
3. Keep the build incremental so every phase can be tested in the browser before the next phase starts.
4. Avoid a big-bang rewrite. Extend the current React + Supabase app feature-by-feature.

## 2. Current project status

The current codebase already includes a useful starter:

### Already present
- React app with Material UI
- Supabase client wiring
- Sign in / sign up page
- Auth context
- Protected member dashboard route
- Protected admin route
- Member workout logging
- Membership plans table and admin CRUD
- Basic member management through an admin edge function
- Exercise explorer feature from the original site

### Already missing or not yet mature
- Password reset flow
- Email verification UX polish
- Rich member profile and onboarding
- Membership lifecycle rules
- Attendance/check-in
- Billing and invoice history
- Class scheduling and bookings
- Waitlists
- Trainer tools
- Progress measurements
- Nutrition plans
- Notifications
- CRM/leads
- POS/store
- Reporting and analytics
- Audit logs
- Multi-branch support
- Access-control integrations

## 3. Build principles

Every implementation step should follow these rules:

1. **Small increments only.** Do not dump a large rewrite.
2. **One thin slice at a time.** Schema first, then service layer, then page logic, then UI polish.
3. **Browser verification after each slice.**
4. **Keep existing routes working** unless the current step explicitly changes them.
5. **Protect data with RLS and server-side admin actions.**
6. **Prefer free-tier tools**:
   - Supabase Auth
   - Supabase Postgres
   - Supabase Storage
   - Supabase Edge Functions
   - Supabase Realtime
   - React + Material UI
7. **Document every schema change** in migration files and in this roadmap.
8. **Separate member features from admin features** in code and permissions.
9. **Avoid putting privileged secrets in the client.**
10. **Design for mobile first** because members will use phones more than desktops.

## 4. Recommended architecture

## Frontend
- React 18
- React Router
- Material UI
- Existing Context for auth is fine initially
- Add feature-specific hooks and service modules as complexity grows
- Consider TanStack Query later when data-fetching grows large

## Backend
- Supabase Auth for user accounts
- Supabase Postgres for app data
- Supabase Storage for files like waivers, invoices, progress photos
- Supabase Edge Functions for privileged operations
- Supabase Realtime for live attendance boards or booking updates

## Data model style
- Keep `auth.users` as identity source
- Keep public app user data in `public.profiles`
- Keep role and permission logic in DB policies and trusted server functions
- Prefer normalized tables for business data, with JSON only where flexibility is helpful and bounded

## 5. Suggested target folder structure

Use the current app as the base and grow into this shape over time:

```text
src/
  app/
    providers/
    theme/
  components/
    common/
    layout/
    forms/
    tables/
    charts/
  context/
  hooks/
  lib/
  routes/
  services/
  features/
    auth/
    dashboard/
    admin/
    members/
    plans/
    attendance/
    classes/
    bookings/
    workouts/
    progress/
    nutrition/
    billing/
    trainers/
    crm/
    notifications/
    pos/
    reports/
    access/
    settings/
  utils/

supabase/
  migrations/
  functions/
    admin-members/
    billing-webhooks/
    send-notifications/
    access-events/
```

## 6. Delivery milestones

The full roadmap is split into four larger milestones.

### Milestone A - Core Gym App
Make the current starter reliable for real member and admin use.

### Milestone B - Member Experience
Add bookings, attendance, progress, and communication.

### Milestone C - Business Operations
Add payments, staff tools, CRM, POS, and reporting.

### Milestone D - Scale and Automation
Add access control, automation, analytics maturity, and multi-branch support.

## 7. Phase roadmap

Below is the recommended phase order. Each phase ends with a usable checkpoint.

---

## Phase 0 - Foundation and cleanup

### Goal
Stabilize the current starter so future work lands on a clean base.

### Why first
The project currently mixes starter code and upgraded code. Before adding more features, the structure, env setup, and migration story should be predictable.

### Main tasks
- Confirm local setup works from a fresh clone
- Remove leftover duplicate files that are no longer used
- Add a `supabase/migrations` workflow instead of relying only on one large `schema.sql`
- Add seed data scripts for membership plans
- Add a central constants/config layer
- Add basic toast/alert pattern consistency
- Add empty/loading/error state conventions
- Add lint cleanup and import hygiene

### Database work
- Split `schema.sql` into versioned migration files
- Keep `schema.sql` only as a convenience snapshot if desired

### Done when
- Fresh install works
- Schema can be applied cleanly
- No ambiguous duplicate page/component structure remains
- Future phases have a consistent place to add files

---

## Phase 1 - Core auth and account hardening

### Goal
Make sign-in, sign-up, role handling, and onboarding reliable.

### User-facing outcomes
- Members can sign up and sign in confidently
- Password reset works
- Email verification flow is clear
- Admins land in the right area automatically
- Suspended users are blocked safely

### Main tasks
- Add forgot password and reset password screens
- Improve auth error handling and redirects
- Add onboarding status to profiles
- Block inactive users after login
- Add role-aware nav items and route redirects
- Add first-login profile completion flow

### Data changes
Add fields such as:
- `phone`
- `date_of_birth` if needed
- `gender` if needed
- `address`
- `emergency_contact_name`
- `emergency_contact_phone`
- `avatar_url`
- `onboarding_completed`
- `waiver_signed_at`

### Done when
- Full auth lifecycle works
- User sees meaningful errors
- Admin/member routing is reliable
- Profile completion is enforced when needed

---

## Phase 2 - Member profiles and membership lifecycle

### Goal
Move from a simple profile row to a real member record.

### User-facing outcomes
- Admin can manage full member details
- Member can see personal info, plan, and account state
- Membership status is explicit and not just implied

### Main tasks
- Build member profile page
- Add membership status logic
- Track join date, renewal date, freeze state, expiry state
- Store digital waiver metadata
- Support document upload for waiver or health declaration

### Suggested tables
- `profiles` (expand)
- `member_documents`
- `membership_subscriptions`
- `membership_status_history`

### Suggested statuses
- `lead`
- `trial`
- `active`
- `paused`
- `expired`
- `cancelled`
- `banned`

### Done when
- Admin can view and update membership lifecycle fields
- Member sees clear plan and account state
- Expiry and pause states are represented in UI and data

---

## Phase 3 - Dashboard 2.0 with real business and member data

### Goal
Upgrade the dashboard from a simple workout screen into a real member home and a real admin overview.

### Member dashboard additions
- Current plan and renewal date
- Attendance summary
- Upcoming bookings
- Outstanding invoices
- Assigned trainer
- Latest workout summary
- Progress snapshot
- Announcements

### Admin dashboard additions
- Active members
- New signups
- Revenue summary
- Expiring memberships
- Today's classes
- No-show rate
- Attendance trend
- Trainer utilization

### Main tasks
- Split dashboard into member widgets and admin widgets
- Add reusable metric, chart, and activity feed components
- Add date filters and simple KPIs
- Add role-based dashboard layouts

### Suggested tables
- `announcements`
- `dashboard_preferences` (optional)
- use joins with attendance, bookings, invoices, subscriptions

### Done when
- Member dashboard is useful daily
- Admin dashboard highlights operational priorities
- Dashboard data is real and not placeholder-only

---

## Phase 4 - Admin panel fully functional

### Goal
Turn the admin page into a complete back-office control center.

### Capabilities
- Search/filter members
- Bulk actions
- Create/edit/suspend/reactivate members
- Assign plans
- View payment status
- Export member lists
- Track audit history
- Manage roles and permissions safely

### Main tasks
- Break the giant admin page into tabs or feature modules
- Add member table with filters, status chips, search, pagination
- Add audit log for high-risk actions
- Improve admin edge function coverage
- Add confirmation dialogs and optimistic refresh logic

### Suggested tables
- `audit_logs`
- `role_permissions` if custom permissions are needed later

### Done when
- Admin can manage members without using the database manually
- Risky actions are auditable
- The UI scales beyond a tiny member list

---

## Phase 5 - Attendance and check-in

### Goal
Digitize facility entry and attendance.

### User-facing outcomes
- Member can check in
- Staff can mark walk-ins or manual attendance
- Admin sees attendance history and trends

### Feature options
- QR check-in
- Staff-assisted manual check-in
- Simple member check-in PIN
- Later: Bluetooth/RFID integration

### Main tasks
- Add attendance table and attendance UI
- Build check-in page for front desk
- Add member attendance history
- Add basic no-show and visit-frequency metrics

### Suggested tables
- `attendance_events`
- `check_in_devices` (later)
- `facility_zones` (later)

### Done when
- A member visit creates a reliable attendance event
- Admin can track who came in and when

---

## Phase 6 - Class and schedule management

### Goal
Allow staff to manage group classes, trainers, rooms, and schedules.

### Main tasks
- Create class templates
- Create scheduled sessions
- Assign trainer and room
- Set capacity
- Set recurring schedules
- Cancel/reschedule sessions
- Show timetable views

### Suggested tables
- `classes`
- `class_sessions`
- `rooms`
- `session_trainers`

### Done when
- Staff can build a weekly schedule
- Members can browse upcoming sessions
- Capacity is enforced

---

## Phase 7 - Online bookings and waitlists

### Goal
Let members reserve sessions from the app.

### User-facing outcomes
- Book a class
- Cancel a booking
- Join waitlist if full
- Auto-promote from waitlist when a slot opens

### Suggested tables
- `bookings`
- `waitlist_entries`

### Main tasks
- Member booking flow
- Booking status rules
- Waitlist promotion logic in edge functions or DB functions
- Booking reminders

### Done when
- Members can self-serve bookings
- Admin/staff can see live occupancy and waitlists

---

## Phase 8 - Workout programming and trainer assignments

### Goal
Go from simple workout logging to trainer-led programming.

### User-facing outcomes
- Trainers can assign workout plans
- Members can view structured programs
- Members can log completion against assigned plans

### Suggested tables
- `workout_templates`
- `workout_template_days`
- `member_program_assignments`
- `exercise_library` (app-owned if needed)

### Main tasks
- Workout template builder
- Assign templates to members
- Member workout completion UI
- Trainer notes and feedback

### Done when
- Trainers can prescribe workouts
- Members can follow and complete planned routines

---

## Phase 9 - Progress tracking and body metrics

### Goal
Help members and trainers track outcomes over time.

### Trackable data
- Weight
- Body fat percentage
- Circumference measurements
- Strength PRs
- Progress photos
- Habit consistency

### Suggested tables
- `progress_logs`
- `measurement_types`
- `personal_records`
- `progress_media`

### Main tasks
- Add progress log forms
- Add charts and timeline
- Add before/after photo handling through Supabase Storage
- Add trainer comments

### Done when
- Member can view progress trends
- Trainer can review progress history

---

## Phase 10 - Nutrition planning

### Goal
Support coaching beyond workouts.

### Main tasks
- Trainer-created meal plans
- Daily calorie and macro targets
- Meal logging
- Water tracking
- Supplement notes
- Dietary preferences and allergies

### Suggested tables
- `nutrition_plans`
- `meal_templates`
- `member_nutrition_assignments`
- `meal_logs`

### Done when
- Trainers can assign nutrition guidance
- Members can follow and log nutrition activity

---

## Phase 11 - Billing, invoices, and renewals

### Goal
Make membership payments operationally useful.

### Important note
The software stack can stay free-tier friendly, but **payment processors themselves are usually not free** and typically charge transaction fees. Build the billing layer first; connect a gateway later.

### Capabilities
- Subscription ledger
- Manual cash payment tracking
- Invoice generation
- Renewal reminders
- Failed payment handling
- Discount codes and promos

### Suggested tables
- `invoices`
- `invoice_items`
- `payments`
- `payment_methods`
- `discounts`
- `subscription_renewals`

### Integration options later
- Razorpay
- Stripe
- Manual offline collection

### Done when
- Admin can see who paid, who is overdue, and what is due next
- Members can view invoice/payment history

---

## Phase 12 - Notifications and communication

### Goal
Improve retention and operational clarity.

### Channels
- In-app notifications
- Email
- SMS
- WhatsApp later via third-party provider

### Use cases
- Booking reminders
- Renewal reminders
- Waitlist promoted
- Class cancelled
- Trainer message
- Marketing campaigns
- Achievement nudges

### Suggested tables
- `notifications`
- `notification_templates`
- `notification_preferences`
- `campaigns`

### Done when
- System-generated reminders work
- Members can manage communication preferences

---

## Phase 13 - Trainer and staff management

### Goal
Support internal team operations.

### Capabilities
- Trainer schedule
- Client roster
- Session notes
- Assigned programs
- Commission tracking
- Staff role separation

### Suggested tables
- `staff_profiles`
- `trainer_assignments`
- `pt_sessions`
- `commissions`

### Done when
- Trainers have their own operational workspace
- Owners can measure trainer activity and assigned revenue

---

## Phase 14 - Reporting and analytics

### Goal
Give the owner real business intelligence.

### KPI examples
- Monthly recurring revenue
- New joins
- Churn
- Retention
- Attendance by day/time
- Most popular classes
- Trainer utilization
- Payment collection rate
- Lead conversion rate

### Main tasks
- Build reusable reporting queries
- Add date ranges
- Add export CSV/PDF
- Add snapshot cards and charts
- Add cohort/retention analysis later

### Done when
- Owner can make decisions without going to raw tables

---

## Phase 15 - Lead management and CRM

### Goal
Track prospects before they become members.

### Main tasks
- Lead capture form
- Source attribution
- Pipeline stages
- Follow-up reminders
- Trial conversion tracking
- Sales notes

### Suggested tables
- `leads`
- `lead_activities`
- `lead_sources`
- `follow_up_tasks`

### Done when
- Gym can track who is interested, who was contacted, and who converted

---

## Phase 16 - POS and retail sales

### Goal
Handle front-desk selling of supplements, apparel, and add-on services.

### Main tasks
- Product catalog
- Inventory counts
- Cart and checkout
- Service add-ons
- Receipt history

### Suggested tables
- `products`
- `inventory_movements`
- `orders`
- `order_items`

### Done when
- Staff can record store sales from the app
- Inventory reduces correctly on sale

---

## Phase 17 - Access control integrations

### Goal
Connect software access rights with real facility entry.

### Progression
1. Manual check-in
2. QR code entry
3. Device event ingestion
4. Later: hardware integrations like RFID/Bluetooth devices

### Suggested tables
- `access_credentials`
- `access_events`
- `access_devices`

### Done when
- Access events can be linked to member status and attendance
- Expired members can be blocked logically

---

## Phase 18 - Multi-branch, settings, and operations

### Goal
Prepare the app for growing gyms or multiple locations.

### Main tasks
- Branch model
- Branch-specific schedules
- Branch-specific staff
- Branch-specific reports
- Tax and currency settings
- Business settings and branding

### Suggested tables
- `branches`
- `branch_memberships`
- `organization_settings`

### Done when
- More than one branch can be managed cleanly

---

## Phase 19 - Security, compliance, and audit maturity

### Goal
Make the system trustworthy and maintainable.

### Main tasks
- Stronger audit logs
- Soft-delete strategy where appropriate
- Data retention policies
- Privacy controls
- Backup/restore runbook
- Better admin permission segmentation
- Error monitoring and incident logging

### Done when
- Critical actions are traceable
- Sensitive workflows are better controlled

---

## Phase 20 - PWA/mobile polish and launch readiness

### Goal
Make daily usage excellent on phones and prepare for real deployment.

### Main tasks
- Improve responsive design
- Add installable PWA experience
- Improve loading states
- Empty state polish
- Performance optimization
- Final QA checklist
- Demo data reset flow
- Documentation handoff

### Done when
- The app feels polished and dependable on mobile and desktop
- Deployment and maintenance docs are complete

---

## 8. Recommended execution order right now

Do **not** jump to payments, POS, or access hardware yet. The best next sequence from the current starter is:

1. Phase 0 - Foundation and cleanup
2. Phase 1 - Core auth and account hardening
3. Phase 2 - Member profiles and membership lifecycle
4. Phase 3 - Dashboard 2.0
5. Phase 4 - Admin panel fully functional
6. Phase 5 - Attendance and check-in
7. Phase 6 - Classes
8. Phase 7 - Bookings and waitlists
9. Phase 8 - Trainer programming
10. Phase 9 - Progress tracking
11. Phase 11 - Billing
12. Then the rest based on business priority

## 9. What the very next implementation session should do

Start with **Phase 0**, not a new feature.

### Phase 0 recommended step slices
1. Remove unused duplicate legacy files and confirm routing points to the new feature pages only
2. Create `supabase/migrations/` and convert current schema into incremental SQL files
3. Add sample seed inserts for plans and one admin-ready demo workflow
4. Clean service layer naming and centralize env/config helpers
5. Add project-level docs for phase workflow and test checklists

### Why this is the best next move
The app already has enough feature surface area that cleanup will save time in every later phase.

## 10. Manual test checklist template for every phase

For every slice, verify:

### App boot
- `npm start` succeeds
- No console errors on initial load
- No broken routes

### Auth
- Sign up works
- Sign in works
- Sign out works
- Protected routes redirect correctly

### Role safety
- Member cannot open admin pages
- Admin can open admin pages

### Data
- New records save successfully
- Edited records refresh correctly
- Deleted records are removed or archived correctly

### UI
- Empty state looks correct
- Loading state looks correct
- Error state looks correct
- Mobile layout is usable

## 11. Agent operating rules

Any coding agent working on this repo should follow these rules exactly:

1. Read this file before making changes.
2. Work in one phase at a time.
3. Make one thin vertical slice per step.
4. Explain which files are changing before changing many files.
5. Never dump the full app code at once.
6. After each step, provide:
   - changed files
   - what changed
   - how to test in browser
   - what to confirm before the next step
7. Prefer modifying existing files over introducing unnecessary abstractions.
8. Put schema changes in `supabase/migrations`.
9. Put privileged logic in Edge Functions, not the browser.
10. Keep code compatible with the current stack unless there is a clear reason to upgrade dependencies.

## 12. Suggested feature-to-file mapping

### Auth
- `src/features/auth/`
- `src/context/AuthContext.js`
- `src/routes/ProtectedRoute.js`
- `src/routes/AdminRoute.js`

### Member dashboard
- `src/features/dashboard/`
- `src/services/`

### Admin
- `src/features/admin/`
- `supabase/functions/admin-members/`

### Future modules
- `src/features/classes/`
- `src/features/bookings/`
- `src/features/attendance/`
- `src/features/billing/`
- `src/features/reports/`

## 13. Definition of done for the full product

The product is in strong shape when:
- members can sign up, log in, manage bookings, track workouts, and view progress
- admins can manage members, plans, schedules, attendance, payments, and reports
- trainers can assign programs and review client progress
- owners can track revenue, retention, and utilization
- data access is role-safe
- mobile experience is reliable
- key business workflows do not require direct database editing

## 14. Current priority recommendation

The most valuable practical next phase is:

**Phase 0 -> Phase 1 -> Phase 3 -> Phase 4**

Why:
- it strengthens the current core
- it makes login/dashboard/admin truly usable
- it unlocks better data before expansion into classes, billing, or CRM

## 15. Working agreement for future implementation sessions

Use this loop every time:
1. Pick one phase
2. Pick one small step within that phase
3. Change only the files needed for that step
4. Run or describe a focused manual test
5. Wait for confirmation
6. Continue to the next step

That keeps the project understandable, testable, and easy to recover if a change breaks.
