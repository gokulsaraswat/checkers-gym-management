import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID') ?? '';
const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET') ?? '';

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing authorization header' }, 401);

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

  const { data: userData } = await userClient.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return json({ error: 'Unauthorized' }, 401);

  const { data: profile } = await adminClient
    .from('profiles')
    .select('id, role')
    .eq('id', userId)
    .single();

  if (!profile || !['admin', 'staff'].includes(profile.role)) {
    return json({ error: 'Admin or staff access required' }, 403);
  }

  const body = await request.json().catch(() => null);
  const paymentLinkId = body?.paymentLinkId as string | undefined;
  if (!paymentLinkId) return json({ error: 'paymentLinkId is required' }, 400);
  if (!razorpayKeyId || !razorpayKeySecret) return json({ error: 'Razorpay secrets are not configured' }, 500);

  const { data: existing, error: existingError } = await adminClient
    .from('invoice_payment_links')
    .select('*')
    .eq('id', paymentLinkId)
    .single();

  if (existingError || !existing) return json({ error: 'Payment link not found' }, 404);
  if (!existing.external_link_id) return json({ error: 'Payment link has no external_link_id' }, 400);

  const authValue = 'Basic ' + btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
  const razorpayResponse = await fetch(`https://api.razorpay.com/v1/payment_links/${existing.external_link_id}`, {
    method: 'GET',
    headers: { Authorization: authValue },
  });
  const razorpayJson = await razorpayResponse.json().catch(() => ({}));

  if (!razorpayResponse.ok) {
    return json({ error: razorpayJson?.error?.description || 'Failed to sync payment link' }, razorpayResponse.status);
  }

  const updatePayload = {
    short_url: razorpayJson.short_url ?? existing.short_url,
    link_status: razorpayJson.status ?? existing.link_status,
    raw_response: razorpayJson,
    paid_at: razorpayJson.status === 'paid' ? new Date().toISOString() : existing.paid_at,
    updated_at: new Date().toISOString(),
  };

  const { data: updated, error: updateError } = await adminClient
    .from('invoice_payment_links')
    .update(updatePayload)
    .eq('id', paymentLinkId)
    .select('*')
    .single();

  if (updateError) return json({ error: updateError.message }, 400);

  return json({ paymentLink: updated, razorpay: razorpayJson }, 200);
});
