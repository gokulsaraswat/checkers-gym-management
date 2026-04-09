import { isSupabaseConfigured, supabase } from '../../lib/supabaseClient';

const missingConfigError = () => new Error('Supabase is not configured. Add your URL and publishable/anon key to .env first.');

const recentAccessEventsSelect = `
  id,
  created_at,
  decision,
  entry_method,
  denial_reason,
  membership_status,
  plan_name,
  waiver_status,
  access_point:access_points (
    id,
    name,
    branch_name,
    point_type
  )
`;

const accessPointsSelect = `
  id,
  branch_name,
  name,
  point_type,
  description,
  offline_code,
  is_active,
  created_at,
  updated_at
`;

const waiverTemplatesSelect = `
  id,
  title,
  version_code,
  summary,
  active_from,
  requires_renewal,
  renewal_days,
  is_active,
  created_at,
  updated_at
`;

function assertConfigured() {
  if (!isSupabaseConfigured || !supabase) {
    throw missingConfigError();
  }
}

async function getCurrentUser() {
  assertConfigured();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  if (!data?.user) {
    throw new Error('No authenticated user found.');
  }
  return data.user;
}

export async function getMyAccessStatus() {
  const user = await getCurrentUser();

  const [waiverResult, passResult] = await Promise.all([
    supabase.rpc('member_has_valid_waiver', { p_user_id: user.id }),
    supabase
      .from('member_access_passes')
      .select('id, access_token, status, expires_at, last_verified_at, created_at, metadata')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (waiverResult.error) {
    throw waiverResult.error;
  }

  if (passResult.error) {
    throw passResult.error;
  }

  return {
    hasValidWaiver: Boolean(waiverResult.data),
    latestPass: passResult.data || null,
  };
}

export async function listAccessPoints() {
  assertConfigured();
  const { data, error } = await supabase
    .from('access_points')
    .select(accessPointsSelect)
    .order('branch_name', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function listWaiverTemplates() {
  assertConfigured();
  const { data, error } = await supabase
    .from('liability_waiver_templates')
    .select(waiverTemplatesSelect)
    .order('active_from', { ascending: false })
    .order('title', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function acceptActiveWaiver(source = 'member_app') {
  assertConfigured();
  const { data, error } = await supabase.rpc('accept_active_waiver', {
    p_source: source,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function issueAccessPass(expiresInMinutes = 15) {
  assertConfigured();
  const { data, error } = await supabase.functions.invoke('issue-access-pass', {
    body: {
      expiresInMinutes,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function verifyAccessPass({ accessToken, accessPointId, entryMethod = 'qr' }) {
  assertConfigured();
  const { data, error } = await supabase.functions.invoke('verify-access-pass', {
    body: {
      accessToken,
      accessPointId,
      entryMethod,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function manualAccessDecision({ userId, accessPointId, decision = 'allow', reason = '' }) {
  assertConfigured();
  const { data, error } = await supabase.rpc('staff_log_manual_access', {
    p_user_id: userId,
    p_access_point_id: accessPointId || null,
    p_decision: decision,
    p_reason: reason || null,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function listMyAccessEvents(limit = 20) {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from('access_events')
    .select(recentAccessEventsSelect)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data || [];
}

export async function listRecentAccessEvents(limit = 40) {
  assertConfigured();
  const { data, error } = await supabase.rpc('list_recent_access_events', {
    p_limit: limit,
  });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getAccessControlSnapshot(days = 14) {
  assertConfigured();
  const { data, error } = await supabase.rpc('get_access_control_snapshot', {
    p_days: days,
  });

  if (error) {
    throw error;
  }

  return data || {};
}

export async function upsertAccessPoint(payload) {
  assertConfigured();
  const { data, error } = await supabase
    .from('access_points')
    .upsert(payload)
    .select(accessPointsSelect)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertWaiverTemplate(payload) {
  assertConfigured();
  const { data, error } = await supabase
    .from('liability_waiver_templates')
    .upsert(payload)
    .select(waiverTemplatesSelect)
    .single();

  if (error) {
    throw error;
  }

  return data;
}
