import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const encoder = new TextEncoder();

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

type WebhookIngestResponse = {
  id: string;
  processing_status: string;
  processing_error: string | null;
};

const toHex = (bytes: ArrayBuffer): string =>
  Array.from(new Uint8Array(bytes))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');

const sha256Hex = async (message: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(message));
  return toHex(digest);
};

const hmacSha256Hex = async (secret: string, message: string): Promise<string> => {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return toHex(signature);
};

const safeEqual = (left: string, right: string): boolean => {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
};

const jsonResponse = (payload: Record<string, unknown>, status = 200): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method === 'GET') {
    return jsonResponse({
      ok: true,
      function: 'razorpay-webhook',
      message: 'POST Razorpay Payment Link webhook events to this endpoint.',
    });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed.' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');

  if (!supabaseUrl || !serviceRoleKey || !webhookSecret) {
    return jsonResponse(
      {
        ok: false,
        error: 'Missing required function secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or RAZORPAY_WEBHOOK_SECRET.',
      },
      500,
    );
  }

  const rawBody = await request.text();
  if (!rawBody) {
    return jsonResponse({ ok: false, error: 'Empty webhook payload.' }, 400);
  }

  const providedSignature = request.headers.get('x-razorpay-signature') ?? '';
  const expectedSignature = await hmacSha256Hex(webhookSecret, rawBody);
  const signatureValid = safeEqual(providedSignature, expectedSignature);
  const payloadSha256 = await sha256Hex(rawBody);

  let payload: Json;
  try {
    payload = JSON.parse(rawBody) as Json;
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON body.' }, 400);
  }

  const eventType =
    payload && typeof payload === 'object' && 'event' in payload && typeof payload.event === 'string'
      ? payload.event
      : 'unknown';

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc('ingest_payment_gateway_webhook', {
    p_provider: 'razorpay',
    p_event_type: eventType,
    p_signature: providedSignature || null,
    p_signature_valid: signatureValid,
    p_payload_sha256: payloadSha256,
    p_payload: payload,
  });

  if (error) {
    return jsonResponse(
      {
        ok: false,
        eventType,
        signatureValid,
        payloadSha256,
        error: error.message,
      },
      signatureValid ? 500 : 401,
    );
  }

  const webhookEvent = (Array.isArray(data) ? data[0] : data) as WebhookIngestResponse | null;
  const processingStatus = webhookEvent?.processing_status ?? 'unknown';
  const successStatuses = new Set(['processed', 'ignored', 'rejected']);
  const statusCode = !signatureValid
    ? 401
    : successStatuses.has(processingStatus)
      ? 200
      : 500;

  return jsonResponse(
    {
      ok: statusCode < 400,
      eventType,
      signatureValid,
      payloadSha256,
      webhookEventId: webhookEvent?.id ?? null,
      processingStatus,
      processingError: webhookEvent?.processing_error ?? null,
    },
    statusCode,
  );
});
