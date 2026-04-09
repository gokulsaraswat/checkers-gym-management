import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function nextStage(attempt) {
  if (attempt >= 4) return 'final_notice';
  if (attempt >= 3) return 'stage_3';
  if (attempt >= 2) return 'stage_2';
  return 'stage_1';
}

Deno.serve(async () => {
  const now = new Date();
  const { data: jobs, error } = await admin
    .from('payment_retry_jobs')
    .select('id, attempt_number, max_attempts, next_retry_at, retry_status')
    .in('retry_status', ['pending', 'manual_review'])
    .lte('next_retry_at', now.toISOString())
    .limit(50);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
  }

  const processed = [];
  for (const job of jobs ?? []) {
    const nextAttempt = Number(job.attempt_number || 0) + 1;
    const exhausted = nextAttempt > Number(job.max_attempts || 3);
    const payload = exhausted
      ? { retry_status: 'failed', last_attempt_at: now.toISOString(), dunning_stage: 'final_notice' }
      : {
          retry_status: 'manual_review',
          attempt_number: nextAttempt,
          last_attempt_at: now.toISOString(),
          next_retry_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          dunning_stage: nextStage(nextAttempt),
        };

    const { error: updateError } = await admin.from('payment_retry_jobs').update(payload).eq('id', job.id);
    if (!updateError) processed.push(job.id);
  }

  return new Response(JSON.stringify({ ok: true, processed }), {
    headers: { 'content-type': 'application/json' },
  });
});
