import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';

const assertSupabase = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Add the project URL and publishable key first.');
  }
  return supabase;
};

export const listPaymentWebhookEvents = async ({ limit = 25 } = {}) => {
  const client = assertSupabase();
  const safeLimit = Math.max(1, Math.min(Number(limit) || 25, 100));

  const { data, error } = await client
    .from('payment_webhook_events')
    .select(
      'id, provider, event_type, processing_status, processing_error, external_link_id, external_payment_id, received_at, processed_at, invoice_id, notes',
    )
    .order('received_at', { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw new Error(error.message || 'Unable to load payment webhook events.');
  }

  return data ?? [];
};

export const getRazorpayWebhookEndpoint = () => {
  const url = process.env.REACT_APP_SUPABASE_URL;
  if (!url) {
    return '';
  }
  return `${url.replace(/\/$/, '')}/functions/v1/razorpay-webhook`;
};
