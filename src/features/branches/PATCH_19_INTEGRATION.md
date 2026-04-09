# Patch 19 integration — multi-branch operations

This patch is intentionally additive.
It adds the branch feature module, the SQL migration, and the helper RPCs, but it does **not** overwrite your app router or navbar automatically.

## Suggested routes

Add these imports where you manage feature routes:

```js
import AdminBranchesPage from './features/branches/AdminBranchesPage';
import StaffBranchesPage from './features/branches/StaffBranchesPage';
import MemberBranchesPage from './features/branches/MemberBranchesPage';
```

Then wire routes like this in your router:

```jsx
<Route path="/admin/branches" element={<AdminBranchesPage />} />
<Route path="/staff/branches" element={<StaffBranchesPage />} />
<Route path="/branches" element={<MemberBranchesPage />} />
```

## Suggested nav links

### Admin nav
- Branches → `/admin/branches`

### Staff nav
- Branch workspace → `/staff/branches`

### Member nav
- My branches → `/branches`

## Recommended follow-up wiring

After this patch is applied and the migration is run, start updating existing feature modules to respect `branch_id` and `home_branch_id`:

- class scheduling
- attendance and check-ins
- billing and finance dashboards
- CRM lead capture
- POS receipts and stock
- access control

## First-pass UX flow

1. Open `/admin/branches`
2. Confirm the seeded `main` branch exists
3. Create any other branches you need
4. Assign staff to each branch
5. Assign members to their home branch
6. Visit `/staff/branches` to verify a staff account sees only its linked branches
7. Visit `/branches` with a member account to verify the home branch and access list
