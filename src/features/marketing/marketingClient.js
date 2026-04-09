import { supabase } from '../../lib/supabaseClient';

function normalizeBranchId(branchId) {
  return branchId || null;
}

async function ensure(resultPromise) {
  const { data, error } = await resultPromise;
  if (error) throw error;
  return data;
}

export async function listAccessibleBranches() {
  try {
    return (await ensure(supabase.rpc('list_accessible_branches'))) || [];
  } catch (error) {
    if (error?.code === '42883') {
      return [];
    }
    throw error;
  }
}

export async function getMarketingDashboardSnapshot(branchId) {
  return ensure(
    supabase.rpc('get_marketing_dashboard_snapshot', {
      p_branch_id: normalizeBranchId(branchId),
    })
  );
}

export async function listMarketingCampaigns(branchId) {
  let query = supabase
    .from('marketing_campaigns')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(25);

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  return ensure(query);
}

export async function saveMarketingCampaign(payload) {
  const cleaned = {
    branch_id: payload.branch_id || null,
    title: payload.title,
    channel: payload.channel,
    campaign_type: payload.campaign_type,
    status: payload.status || 'draft',
    scheduled_for: payload.scheduled_for || null,
    notes: payload.notes || null,
    audience_filter: payload.audience_filter || {},
  };

  if (payload.id) {
    return ensure(
      supabase
        .from('marketing_campaigns')
        .update(cleaned)
        .eq('id', payload.id)
        .select('*')
        .single()
    );
  }

  return ensure(
    supabase.from('marketing_campaigns').insert(cleaned).select('*').single()
  );
}

export async function listReferralPrograms(branchId) {
  let query = supabase
    .from('referral_programs')
    .select('*')
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: false });

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  return ensure(query);
}

export async function saveReferralProgram(payload) {
  const cleaned = {
    branch_id: payload.branch_id || null,
    name: payload.name,
    code_prefix: payload.code_prefix,
    reward_type: payload.reward_type,
    referrer_reward_value: Number(payload.referrer_reward_value || 0),
    referee_reward_value: Number(payload.referee_reward_value || 0),
    is_active: payload.is_active !== false,
    start_date: payload.start_date || null,
    end_date: payload.end_date || null,
    notes: payload.notes || null,
  };

  if (payload.id) {
    return ensure(
      supabase
        .from('referral_programs')
        .update(cleaned)
        .eq('id', payload.id)
        .select('*')
        .single()
    );
  }

  return ensure(
    supabase.from('referral_programs').insert(cleaned).select('*').single()
  );
}

export async function listReferralInvites(branchId) {
  let query = supabase
    .from('referral_invites')
    .select('*, referral_programs(name, code_prefix), profiles:joined_member_id(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(25);

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  return ensure(query);
}

export async function createReferralInvite(payload) {
  const cleaned = {
    branch_id: payload.branch_id || null,
    program_id: payload.program_id || null,
    referred_name: payload.referred_name,
    referred_email: payload.referred_email || null,
    referred_phone: payload.referred_phone || null,
    invite_code: payload.invite_code,
    status: payload.status || 'invited',
    notes: payload.notes || null,
  };

  return ensure(
    supabase.from('referral_invites').insert(cleaned).select('*').single()
  );
}

export async function listPromoCodes(branchId) {
  let query = supabase
    .from('promo_codes')
    .select('*')
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: false });

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  return ensure(query);
}

export async function savePromoCode(payload) {
  const cleaned = {
    branch_id: payload.branch_id || null,
    code: payload.code,
    label: payload.label,
    discount_type: payload.discount_type,
    discount_value: Number(payload.discount_value || 0),
    applies_to: payload.applies_to || 'all',
    valid_from: payload.valid_from || null,
    valid_to: payload.valid_to || null,
    max_redemptions: payload.max_redemptions ? Number(payload.max_redemptions) : null,
    is_active: payload.is_active !== false,
    notes: payload.notes || null,
  };

  if (payload.id) {
    return ensure(
      supabase.from('promo_codes').update(cleaned).eq('id', payload.id).select('*').single()
    );
  }

  return ensure(supabase.from('promo_codes').insert(cleaned).select('*').single());
}

export async function listTrialPasses(branchId) {
  let query = supabase
    .from('trial_passes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(25);

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  return ensure(query);
}

export async function saveTrialPass(payload) {
  const cleaned = {
    branch_id: payload.branch_id || null,
    full_name: payload.full_name,
    email: payload.email || null,
    phone: payload.phone || null,
    status: payload.status || 'issued',
    source: payload.source || 'walk_in',
    issued_on: payload.issued_on || new Date().toISOString().slice(0, 10),
    expires_on: payload.expires_on,
    notes: payload.notes || null,
  };

  if (payload.id) {
    return ensure(
      supabase.from('trial_passes').update(cleaned).eq('id', payload.id).select('*').single()
    );
  }

  return ensure(supabase.from('trial_passes').insert(cleaned).select('*').single());
}
