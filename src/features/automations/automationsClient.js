import { supabase } from '../../lib/supabaseClient';

export async function getAutomationSnapshot() {
  const { data, error } = await supabase.rpc('get_admin_automation_snapshot');
  if (error) throw error;
  return data?.[0] || null;
}

export async function listBackupPolicies() {
  const { data, error } = await supabase.rpc('list_backup_policies');
  if (error) throw error;
  return data || [];
}

export async function saveBackupPolicy(payload) {
  const {
    policyName,
    backupScope,
    backupMode = 'manual',
    retentionDays = 30,
    enabled = true,
    notes = null,
  } = payload;

  const { data, error } = await supabase.rpc('save_backup_policy', {
    p_policy_name: policyName,
    p_backup_scope: backupScope,
    p_backup_mode: backupMode,
    p_retention_days: retentionDays,
    p_enabled: enabled,
    p_notes: notes,
  });

  if (error) throw error;
  return data;
}

export async function listRecentJobRuns(limit = 25) {
  const { data, error } = await supabase.rpc('list_recent_job_runs', {
    p_limit: limit,
  });
  if (error) throw error;
  return data || [];
}

export async function recordSystemHealthCheck(payload) {
  const {
    checkKey,
    checkName,
    status,
    severity = 'info',
    responseTimeMs = null,
    meta = {},
  } = payload;

  const { data, error } = await supabase.rpc('record_system_health_check', {
    p_check_key: checkKey,
    p_check_name: checkName,
    p_status: status,
    p_severity: severity,
    p_response_time_ms: responseTimeMs,
    p_meta: meta,
  });

  if (error) throw error;
  return data;
}
