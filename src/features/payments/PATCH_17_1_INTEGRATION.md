# Patch 17.1 integration notes — Razorpay webhooks and auto reconciliation

This patch is meant to sit on top of Patch 17.

## What it adds
- `supabase/functions/razorpay-webhook/index.ts`
- `supabase/migrations/20260407001810_razorpay_webhooks_and_auto_reconciliation.sql`
- `src/features/payments/paymentWebhookClient.js`
- `src/features/payments/AdminPaymentWebhookEventsCard.js`

## 1) Run the migration
Run:

```text
supabase/migrations/20260407001810_razorpay_webhooks_and_auto_reconciliation.sql
```

This adds:
- webhook event audit table
- automatic invoice reconciliation database function
- webhook metadata columns on `invoice_payment_links`
- a stricter unique constraint for `billing_payments.external_payment_id`

## 2) Deploy the new function
```bash
npx supabase functions deploy razorpay-webhook --no-verify-jwt
npx supabase secrets set RAZORPAY_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET
```

## 3) Configure Razorpay dashboard
Set the webhook URL to:

```text
https://YOUR_PROJECT_ID.supabase.co/functions/v1/razorpay-webhook
```

Select at least these events:
- `payment_link.paid`
- `payment_link.partially_paid`
- `payment_link.cancelled`

Use the same secret in Razorpay Dashboard and the Supabase function secret.

## 4) Show the webhook log in the admin payments page
In `src/features/payments/AdminPaymentsPage.js` add:

```js
import AdminPaymentWebhookEventsCard from './AdminPaymentWebhookEventsCard';
```

Then render it under the existing payment-link management cards:

```jsx
<AdminPaymentWebhookEventsCard />
```

## 5) What changes in behavior
Before Patch 17.1:
- admin created a payment link
- member paid externally
- admin clicked **Sync** to refresh status

After Patch 17.1:
- Razorpay sends the webhook automatically
- Supabase verifies the signature
- the link row updates automatically
- `billing_payments` is inserted or updated automatically
- invoice totals/status are recalculated automatically
- admins can review webhook deliveries in the UI

## 6) Notes
- Keep Patch 17 sync actions anyway. They are still useful as a manual fallback.
- This patch is written for Razorpay Payment Links only.
- If you later add webhooks for refunds or failed payments, extend `public.ingest_payment_gateway_webhook(...)` instead of creating a second reconciliation path.
