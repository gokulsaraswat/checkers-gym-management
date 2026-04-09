import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const APP_BASE_URL = Deno.env.get('APP_BASE_URL') ?? '';
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async () => {
  const nowIso = new Date().toISOString();
  const { data: dueRows, error } = await admin
    .from('membership_renewal_queue')
    .select('id, invoice_id, user_id, renewal_amount, queue_status')
    .in('queue_status', ['pending', 'manual_review'])
    .lte('scheduled_for', nowIso)
    .limit(50);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
  }

  const updatedIds = [];
  for (const row of dueRows ?? []) {
    const nextStatus = row.invoice_id ? 'processing' : 'manual_review';
    const { error: updateError } = await admin
      .from('membership_renewal_queue')
      .update({ queue_status: nextStatus, processed_at: nowIso, notes: APP_BASE_URL ? `Queued from ${APP_BASE_URL}` : null })
      .eq('id', row.id);
    if (!updateError) updatedIds.push(row.id);
  }

  return new Response(JSON.stringify({ ok: true, processed: updatedIds.length, updatedIds }), {
    headers: { 'content-type': 'application/json' },
  });
});
