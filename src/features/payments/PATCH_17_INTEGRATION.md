# Patch 17 integration notes

This replacement bundle adds new files only. Wire them into your existing Phase 16 tree with the steps below.

## 1. Add route constants
Update `src/app/paths.js` and add:

```js
ADMIN_PAYMENTS: '/admin/payments',
```

## 2. Add route in `src/app/AppRouter.js`
Import:

```js
import AdminPaymentsPage from '../features/payments/AdminPaymentsPage';
```

Then add a protected admin route:

```jsx
<Route path={PATHS.ADMIN_PAYMENTS} element={<AdminRoute><AdminPaymentsPage /></AdminRoute>} />
```

Adapt the exact wrapper syntax to match your router file.

## 3. Add navbar/admin shortcut
Add an admin link labeled `Payments` pointing to `/admin/payments`.

## 4. Optional member billing integration
In your billing screen, query `invoice_payment_links` for the current member's unpaid invoices and render active `short_url` values as `Pay now` links.

A simple pattern:

```js
const { data } = await supabase
  .from('invoice_payment_links')
  .select('*')
  .in('link_status', ['created', 'issued', 'partially_paid'])
  .order('created_at', { ascending: false });
```

Filter/join this with your invoice rows according to your existing invoice schema.

## 5. Deploy functions
```bash
npx supabase functions deploy create-payment-link
npx supabase functions deploy sync-payment-link
npx supabase functions deploy cancel-payment-link

npx supabase secrets set RAZORPAY_KEY_ID=YOUR_KEY_ID
npx supabase secrets set RAZORPAY_KEY_SECRET=YOUR_KEY_SECRET
```

## 6. Security checks
- keep Razorpay secrets only in Supabase Edge Function secrets
- do not expose them in React `.env`
- restrict `/admin/payments` to admin users
- optionally let staff read link statuses but not create/cancel links
