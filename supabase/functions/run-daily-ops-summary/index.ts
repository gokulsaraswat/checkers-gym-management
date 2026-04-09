import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async () => {
  const startedAt = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  let runStatus = 'success';
  let details: Record<string, unknown> = {};

  try {
    const [membersResult, invoicesResult] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('billing_invoices').select('id', { count: 'exact', head: true }),
    ]);

    details = {
      totalProfiles: membersResult.count ?? 0,
      totalInvoices: invoicesResult.count ?? 0,
      note: 'Daily ops summary scaffold created by Patch 22.',
    };
  } catch (error) {
    runStatus = 'failed';
    details = {
      message: error instanceof Error ? error.message : String(error),
    };
  }

  await supabase.from('scheduled_job_runs').insert({
    job_key: 'daily-ops-summary',
    job_name: 'Daily ops summary',
    function_name: 'run-daily-ops-summary',
    run_status: runStatus,
    run_source: 'edge_function',
    started_at: new Date(startedAt).toISOString(),
    finished_at: new Date().toISOString(),
    duration_ms: Date.now() - startedAt,
    details,
  });

  return new Response(
    JSON.stringify({ ok: runStatus === 'success', details }),
    { headers: { 'content-type': 'application/json' }, status: runStatus === 'success' ? 200 : 500 },
  );
});
