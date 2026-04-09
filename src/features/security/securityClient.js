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

const normalizeSingle = (data) => (Array.isArray(data) ? data[0] || null : data || null);

export const fetchSecuritySummary = async () => {
  const client = ensureSupabase();
  const { data, error } = await client.rpc('list_security_dashboard_snapshot');
  unwrap(error, 'Unable to load the security dashboard summary.');
  return normalizeSingle(data) || {
    open_incidents: 0,
    critical_incidents: 0,
    overrides_count: 0,
    flagged_users: 0,
    audit_events_7d: 0,
    audit_events_30d: 0,
  };
};

export const fetchPermissionOverrides = async () => {
  const client = ensureSupabase();
  const { data, error } = await client.rpc('list_permission_overrides');
  unwrap(error, 'Unable to load permission overrides.');
  return data ?? [];
};

export const savePermissionOverride = async ({ roleName, permissionKey, accessMode, notes }) => {
  const client = ensureSupabase();
  const { data, error } = await client.rpc('upsert_permission_override', {
    p_role_name: roleName,
    p_permission_key: permissionKey,
    p_access_mode: accessMode,
    p_notes: notes?.trim() || null,
  });

  unwrap(error, 'Unable to save the permission override.');
  return data;
};

export const deletePermissionOverride = async (overrideId) => {
  const client = ensureSupabase();
  const { error } = await client.rpc('delete_permission_override', {
    p_override_id: overrideId,
  });

  unwrap(error, 'Unable to delete the permission override.');
};

export const fetchSecurityIncidents = async ({ status = null, severity = null, limit = 40 } = {}) => {
  const client = ensureSupabase();
  const { data, error } = await client.rpc('list_security_incidents', {
    p_status: status || null,
    p_severity: severity || null,
    p_limit: limit,
  });

  unwrap(error, 'Unable to load security incidents.');
  return data ?? [];
};

export const saveSecurityIncident = async (incident) => {
  const client = ensureSupabase();
  const { data, error } = await client.rpc('save_security_incident', {
    p_id: incident.id || null,
    p_incident_status: incident.incident_status,
    p_severity: incident.severity,
    p_title: incident.title?.trim(),
    p_description: incident.description?.trim() || null,
    p_branch_id: incident.branch_id || null,
    p_owner_user_id: incident.owner_user_id || null,
    p_related_user_id: incident.related_user_id || null,
    p_related_entity_type: incident.related_entity_type?.trim() || null,
    p_related_entity_id: incident.related_entity_id?.trim() || null,
    p_resolution_notes: incident.resolution_notes?.trim() || null,
  });

  unwrap(error, 'Unable to save the security incident.');
  return data;
};

export const fetchUserSecurityFlags = async ({ search = '', limit = 60 } = {}) => {
  const client = ensureSupabase();
  const { data, error } = await client.rpc('list_user_security_flags', {
    p_search: search?.trim() || null,
    p_limit: limit,
  });

  unwrap(error, 'Unable to load user security flags.');
  return data ?? [];
};

export const saveUserSecurityFlag = async (flag) => {
  const client = ensureSupabase();
  const { data, error } = await client.rpc('upsert_user_security_flag', {
    p_user_id: flag.user_id,
    p_require_password_reset: Boolean(flag.require_password_reset),
    p_member_portal_access: Boolean(flag.member_portal_access),
    p_staff_portal_access: Boolean(flag.staff_portal_access),
    p_admin_portal_access: Boolean(flag.admin_portal_access),
    p_notes: flag.notes?.trim() || null,
  });

  unwrap(error, 'Unable to save the user security flag.');
  return data;
};

export const fetchAuditLogEvents = async ({ limit = 80, actionKey = null, entityType = null, branchId = null } = {}) => {
  const client = ensureSupabase();
  const { data, error } = await client.rpc('list_audit_log_events', {
    p_limit: limit,
    p_action_key: actionKey || null,
    p_entity_type: entityType || null,
    p_branch_id: branchId || null,
  });

  unwrap(error, 'Unable to load audit log events.');
  return data ?? [];
};

export const fetchSecurityUsers = async ({ search = '', limit = 120 } = {}) => {
  const client = ensureSupabase();
  const { data, error } = await client.rpc('list_security_subject_users', {
    p_search: search?.trim() || null,
    p_limit: limit,
  });

  unwrap(error, 'Unable to load users for security controls.');
  return data ?? [];
};

export const fetchSecurityBranches = async () => {
  const client = ensureSupabase();
  const { data, error } = await client.rpc('list_security_branches');
  unwrap(error, 'Unable to load branches for security workflows.');
  return data ?? [];
};
