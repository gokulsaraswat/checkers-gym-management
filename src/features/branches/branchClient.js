import { isSupabaseConfigured, supabase } from '../../lib/supabaseClient';

const missingConfigError = () => new Error('Supabase is not configured. Add your URL and publishable/anon key to .env first.');

const ensureSupabase = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw missingConfigError();
  }

  return supabase;
};

const unwrap = (error, fallbackMessage) => {
  if (error) {
    throw new Error(error.message || fallbackMessage);
  }
};

export const fetchBranches = async () => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('gym_branches')
    .select('*')
    .order('name', { ascending: true });

  unwrap(error, 'Unable to load branches.');
  return data ?? [];
};

export const fetchAccessibleBranches = async () => {
  const client = ensureSupabase();
  const { data, error } = await client.rpc('list_accessible_branches');
  unwrap(error, 'Unable to load accessible branches.');
  return data ?? [];
};

export const saveBranch = async (branch) => {
  const client = ensureSupabase();

  const payload = {
    branch_code: branch.branch_code?.trim().toLowerCase(),
    name: branch.name?.trim(),
    timezone: branch.timezone?.trim() || 'Asia/Kolkata',
    phone: branch.phone?.trim() || null,
    email: branch.email?.trim() || null,
    address_line_1: branch.address_line_1?.trim() || null,
    address_line_2: branch.address_line_2?.trim() || null,
    city: branch.city?.trim() || null,
    state: branch.state?.trim() || null,
    postal_code: branch.postal_code?.trim() || null,
    country: branch.country?.trim() || 'India',
    capacity_limit: branch.capacity_limit === '' || branch.capacity_limit === null || branch.capacity_limit === undefined
      ? null
      : Number(branch.capacity_limit),
    opened_on: branch.opened_on || null,
    notes: branch.notes?.trim() || null,
    is_active: Boolean(branch.is_active),
  };

  if (!payload.branch_code) {
    throw new Error('Branch code is required.');
  }

  if (!payload.name) {
    throw new Error('Branch name is required.');
  }

  if (branch.id) {
    const { data, error } = await client
      .from('gym_branches')
      .update(payload)
      .eq('id', branch.id)
      .select('*')
      .single();

    unwrap(error, 'Unable to update branch.');
    return data;
  }

  const { data, error } = await client
    .from('gym_branches')
    .insert([payload])
    .select('*')
    .single();

  unwrap(error, 'Unable to create branch.');
  return data;
};

export const fetchBranchSummary = async (branchId) => {
  const client = ensureSupabase();
  const { data, error } = await client.rpc('get_branch_dashboard_snapshot', {
    p_branch_id: branchId || null,
  });

  unwrap(error, 'Unable to load branch summary.');
  return Array.isArray(data) ? data[0] || null : data || null;
};

export const fetchBranchStaffAssignments = async (branchId) => {
  const client = ensureSupabase();
  const { data, error } = await client.rpc('list_branch_staff_assignments', {
    p_branch_id: branchId || null,
  });

  unwrap(error, 'Unable to load staff assignments.');
  return data ?? [];
};

export const fetchBranchMembers = async (branchId, searchTerm = '') => {
  const client = ensureSupabase();
  let query = client
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      phone,
      role,
      is_active,
      membership_status,
      membership_end_date,
      home_branch_id,
      plan:membership_plans (
        id,
        name,
        price
      )
    `)
    .eq('role', 'member')
    .eq('home_branch_id', branchId)
    .order('full_name', { ascending: true })
    .limit(100);

  if (searchTerm?.trim()) {
    query = query.or(`full_name.ilike.%${searchTerm.trim()}%,email.ilike.%${searchTerm.trim()}%,phone.ilike.%${searchTerm.trim()}%`);
  }

  const { data, error } = await query;
  unwrap(error, 'Unable to load branch members.');
  return data ?? [];
};

export const fetchOwnBranchAffiliations = async (userId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('member_branch_affiliations')
    .select(`
      id,
      branch_id,
      affiliation_type,
      is_primary,
      starts_on,
      ends_on,
      notes,
      branch:gym_branches (
        id,
        branch_code,
        name,
        city,
        state,
        timezone,
        is_active
      )
    `)
    .eq('member_id', userId)
    .order('is_primary', { ascending: false })
    .order('starts_on', { ascending: false });

  unwrap(error, 'Unable to load branch affiliations.');
  return data ?? [];
};

export const assignStaffToBranch = async ({ branchId, staffId, assignmentRole, isPrimary }) => {
  const client = ensureSupabase();
  const { data, error } = await client.rpc('assign_staff_to_branch', {
    p_branch_id: branchId,
    p_staff_id: staffId,
    p_assignment_role: assignmentRole,
    p_is_primary: Boolean(isPrimary),
  });

  unwrap(error, 'Unable to assign staff to branch.');
  return data;
};

export const assignMemberHomeBranch = async ({ branchId, memberId, affiliationType = 'home_branch', isPrimary = true }) => {
  const client = ensureSupabase();
  const { data, error } = await client.rpc('assign_member_to_branch', {
    p_branch_id: branchId,
    p_member_id: memberId,
    p_affiliation_type: affiliationType,
    p_is_primary: Boolean(isPrimary),
  });

  unwrap(error, 'Unable to assign member to branch.');
  return data;
};

export const fetchStaffCandidates = async () => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('profiles')
    .select('id, full_name, email, role, home_branch_id')
    .in('role', ['admin', 'staff'])
    .eq('is_active', true)
    .order('full_name', { ascending: true });

  unwrap(error, 'Unable to load staff candidates.');
  return data ?? [];
};

export const fetchMemberCandidates = async () => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('profiles')
    .select('id, full_name, email, role, home_branch_id, membership_status')
    .eq('role', 'member')
    .eq('is_active', true)
    .order('full_name', { ascending: true })
    .limit(200);

  unwrap(error, 'Unable to load members.');
  return data ?? [];
};
