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

const rpc = async (fnName, params = {}, fallbackMessage = 'Unable to complete the operations request.') => {
  const client = ensureSupabase();
  const { data, error } = await client.rpc(fnName, params);
  unwrap(error, fallbackMessage);
  return data;
};

export const fetchOpsToolingSnapshot = async () => {
  const result = await rpc('get_ops_tooling_snapshot', {}, 'Unable to load the operations snapshot.');
  return normalizeSingle(result) || {
    active_backup_policies: 0,
    failed_job_runs_7d: 0,
    latest_backup_status: 'unknown',
    open_incident_count: 0,
    queued_export_count: 0,
    total_members: 0,
    unhealthy_health_checks: 0,
    unpaid_invoices: 0,
  };
};

export const listOpsChecklist = async () => {
  const result = await rpc('list_ops_checklist', {}, 'Unable to load the operations checklist.');
  return result ?? [];
};

export const toggleOpsChecklistItem = async (itemId, completed) => {
  const result = await rpc('toggle_ops_checklist_item', {
    p_completed: completed,
    p_id: itemId,
  }, 'Unable to update the operations checklist item.');

  return normalizeSingle(result) || result;
};

export const listOpenOpsIncidents = async () => {
  const result = await rpc('list_open_ops_incidents', {}, 'Unable to load open operational incidents.');
  return result ?? [];
};

export const listReleaseNotes = async (limit = 10) => {
  const result = await rpc('list_release_notes', {
    p_limit: limit,
  }, 'Unable to load release notes.');

  return result ?? [];
};

export const listOpsExportJobs = async (limit = 20) => {
  const result = await rpc('list_ops_export_jobs', {
    p_limit: limit,
  }, 'Unable to load recent export jobs.');

  return result ?? [];
};

export const queueOpsExportJob = async ({
  exportType,
  exportLabel,
  fileFormat = 'csv',
  filters = {},
  notes = '',
}) => {
  const result = await rpc('queue_ops_export_job', {
    p_export_type: exportType,
    p_export_label: exportLabel || null,
    p_file_format: fileFormat,
    p_filters: filters,
    p_notes: notes?.trim() || null,
  }, 'Unable to queue the export job.');

  return normalizeSingle(result) || result;
};

export const listBackupPolicies = async () => {
  const result = await rpc('list_backup_policies', {}, 'Unable to load backup policies.');
  return result ?? [];
};

export const saveBackupPolicy = async ({
  policyName,
  backupScope,
  backupMode = 'manual',
  retentionDays = 30,
  enabled = true,
  notes = '',
}) => {
  const result = await rpc('save_backup_policy', {
    p_policy_name: policyName?.trim(),
    p_backup_scope: backupScope?.trim(),
    p_backup_mode: backupMode?.trim() || 'manual',
    p_retention_days: Number(retentionDays) || 30,
    p_enabled: Boolean(enabled),
    p_notes: notes?.trim() || null,
  }, 'Unable to save the backup policy.');

  return normalizeSingle(result) || result;
};

export const listRecentBackupRuns = async (limit = 12) => {
  const result = await rpc('list_recent_backup_runs', {
    p_limit: limit,
  }, 'Unable to load recent backup runs.');

  return result ?? [];
};

export const recordBackupRun = async ({
  policyId = null,
  policyName = null,
  runStatus = 'completed',
  runSource = 'manual',
  backupLocation = null,
  bytesCopied = null,
  notes = '',
}) => {
  const result = await rpc('record_backup_run', {
    p_policy_id: policyId,
    p_policy_name: policyName?.trim() || null,
    p_run_status: runStatus?.trim() || 'completed',
    p_run_source: runSource?.trim() || 'manual',
    p_backup_location: backupLocation?.trim() || null,
    p_bytes_copied: Number.isFinite(Number(bytesCopied)) ? Number(bytesCopied) : null,
    p_notes: notes?.trim() || null,
  }, 'Unable to record the backup run.');

  return normalizeSingle(result) || result;
};

export const listRecentJobRuns = async (limit = 12) => {
  const result = await rpc('list_recent_job_runs', {
    p_limit: limit,
  }, 'Unable to load recent job runs.');

  return result ?? [];
};

export const listSystemHealthChecks = async () => {
  const result = await rpc('list_system_health_checks', {}, 'Unable to load system health checks.');
  return result ?? [];
};

export const seedOpsToolingDefaults = async () => {
  return rpc('seed_ops_tooling_defaults', {}, 'Unable to seed the operations defaults.');
};
