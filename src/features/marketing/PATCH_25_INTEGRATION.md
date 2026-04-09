# Patch 25 integration notes

This patch is additive and does not automatically edit the app router or navbar.

## Recommended route

Add an admin-only route:

```jsx
<Route path="/admin/marketing" element={<AdminMarketingPage />} />
```

## Recommended nav link

Add an admin navigation item pointing to:

```text
/admin/marketing
```

## Suggested dashboard shortcut

Add a card or quick action on the admin dashboard labelled:

- Marketing
- Growth
- Referrals
- Promo codes

## Data sources introduced by this patch

- marketing_campaigns
- referral_programs
- referral_invites
- promo_codes
- promo_redemptions
- trial_passes

## Supabase step

Run:

```text
supabase/migrations/20260407002500_marketing_growth_campaigns_and_referrals.sql
```

No new Edge Functions or secrets are required in this patch.
