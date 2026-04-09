import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async () => {
  const startedAt = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  let candidateCount = 0;
  let runStatus = 'success';
  let details: Record<string, unknown> = {};

  try {
    const sevenDaysAhead = new Date();
    sevenDaysAhead.setDate(sevenDaysAhead.getDate() + 7);

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, membership_end_date')
      .gte('membership_end_date', new Date().toISOString().slice(0, 10))
      .lte('membership_end_date', sevenDaysAhead.toISOString().slice(0, 10))
      .limit(250);

    if (error) throw error;

    candidateCount = data?.length ?? 0;
    details = {
      candidateCount,
      reminderWindowDays: 7,
      note: 'Scaffold runner created by Patch 22. Wire email or notification fan-out in a later patch.',
    };
  } catch (error) {
    runStatus = 'failed';
    details = {
      message: error instanceof Error ? error.message : String(error),
    };
  }

  await supabase.from('scheduled_job_runs').insert({
    job_key: 'renewal-reminders',
    job_name: 'Renewal reminders',
    function_name: 'run-renewal-reminders',
    run_status: runStatus,
    run_source: 'edge_function',
    started_at: new Date(startedAt).toISOString(),
    finished_at: new Date().toISOString(),
    duration_ms: Date.now() - startedAt,
    details,
  });

  return new Response(
    JSON.stringify({ ok: runStatus === 'success', candidateCount, details }),
    { headers: { 'content-type': 'application/json' }, status: runStatus === 'success' ? 200 : 500 },
  );
});
