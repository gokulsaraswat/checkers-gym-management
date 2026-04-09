import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

serve(async () => {
  const now = new Date().toISOString();

  return new Response(
    JSON.stringify({
      ok: true,
      service: 'public-health-check',
      timestamp: now,
      environment: Deno.env.get('SUPABASE_URL') ? 'configured' : 'unknown',
    }),
    {
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-store',
      },
      status: 200,
    },
  );
});
