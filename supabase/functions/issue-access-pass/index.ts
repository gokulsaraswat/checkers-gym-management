import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type IssuePassPayload = {
  expiresInMinutes?: number;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const authorization = request.headers.get('Authorization');

  if (!supabaseUrl || !supabaseAnonKey || !authorization) {
    return new Response(JSON.stringify({ error: 'Missing Supabase runtime configuration or auth header.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });

  const body = (await request.json().catch(() => ({}))) as IssuePassPayload;
  const expiresInMinutes = Number.isFinite(body.expiresInMinutes)
    ? Number(body.expiresInMinutes)
    : 15;

  const { data, error } = await client.rpc('issue_member_access_pass', {
    p_expires_in_minutes: expiresInMinutes,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const qrValue = JSON.stringify({
    type: 'gym_access_pass',
    token: data.access_token,
    expiresAt: data.expires_at,
  });

  return new Response(JSON.stringify({ accessPass: data, qrValue }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
