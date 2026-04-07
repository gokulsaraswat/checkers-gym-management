# Agent Handoff Guide

Read `IMPLEMENTATION_README.md` first.

## Mission
Extend this React + Supabase gym app into a production-grade gym management platform using thin, testable slices.

## Non-negotiable workflow
- Work phase-by-phase
- Work step-by-step
- Do not dump all code at once
- Keep each step small enough to test in the browser immediately
- Wait for user confirmation before moving to the next implementation step when working interactively

## Response format for each implementation step
1. Goal of the step
2. Files to change
3. Exact code changes
4. How to test in browser
5. What success looks like
6. What comes next after confirmation

## Technical guardrails
- Keep React Router structure intact
- Reuse Material UI patterns already present
- Put data logic in `src/services`
- Put privileged actions in Supabase Edge Functions
- Put schema changes in `supabase/migrations`
- Protect all business data with RLS
- Do not place service-role secrets in frontend code

## When adding a new feature
Touch files in this order where possible:
1. migration SQL
2. service layer
3. page/container logic
4. presentational components
5. route wiring
6. documentation

## Quality checklist
- no broken imports
- no dead routes
- empty/loading/error states handled
- member/admin permission boundaries respected
- browser test steps provided
