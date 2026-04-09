import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async () => {
  const { data: requests, error } = await admin
    .from('refund_requests')
    .select('id, invoice_id, user_id, requested_amount, request_status')
    .eq('request_status', 'approved')
    .limit(25);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
  }

  const created = [];
  for (const row of requests ?? []) {
    const { data: existing } = await admin
      .from('refund_transactions')
      .select('id')
      .eq('refund_request_id', row.id)
      .limit(1)
      .maybeSingle();

    if (existing?.id) continue;

    const { error: insertError } = await admin.from('refund_transactions').insert({
      refund_request_id: row.id,
      invoice_id: row.invoice_id,
      user_id: row.user_id,
      refund_amount: row.requested_amount ?? 0,
      refund_status: 'initiated',
      gateway_name: 'manual',
      processed_at: new Date().toISOString(),
      notes: 'Created by process-refunds function',
    });

    if (!insertError) {
      created.push(row.id);
      await admin
        .from('refund_requests')
        .update({ request_status: 'processed', resolved_at: new Date().toISOString() })
        .eq('id', row.id);
    }
  }

  return new Response(JSON.stringify({ ok: true, created }), {
    headers: { 'content-type': 'application/json' },
  });
});
