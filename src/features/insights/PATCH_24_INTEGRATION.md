# Patch 24 integration notes

This patch is intentionally additive. Wire it into your existing app manually so it does not overwrite your current router or navbar.

## 1. Import the page
Add an import that matches your router structure:

```js
import AdminInsightsPage from './features/insights/AdminInsightsPage';
```

## 2. Add an admin-only route
Use your existing admin guard or protected route pattern and add a route such as:

```jsx
<Route path="/admin/insights" element={<AdminInsightsPage />} />
```

If your app already uses a shared admin shell, place the page inside that shell.

## 3. Add a nav entry
Add an admin navigation item for:

```text
Insights
```

Suggested target route:

```text
/admin/insights
```

## 4. Optional dashboard shortcut
If you already have an admin dashboard or operations page, add a shortcut card linking to the new insights route.

## 5. Supabase
Run this migration after copying the files:

```text
supabase/migrations/20260407002400_advanced_analytics_and_ai_insights.sql
```

## 6. No extra setup required
- No new npm packages
- No new Edge Functions
- No new Supabase secrets
