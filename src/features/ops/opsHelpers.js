export const EXPORT_PRESETS = [
  {
    key: 'member-directory',
    label: 'Member directory',
    exportType: 'member_directory',
    fileFormat: 'csv',
    description: 'Queue a directory export covering member profile, plan, and membership status fields.',
    filters: {
      scope: 'members',
      includeInactive: true,
      includePlanSummary: true,
    },
  },
  {
    key: 'finance-summary',
    label: 'Finance summary',
    exportType: 'finance_summary',
    fileFormat: 'csv',
    description: 'Queue a finance-focused export for invoice ageing, renewals, and collections follow-up.',
    filters: {
      scope: 'finance',
      includeOverdueOnly: false,
      groupBy: 'billing_cycle',
    },
  },
  {
    key: 'attendance-audit',
    label: 'Attendance audit',
    exportType: 'attendance_audit',
    fileFormat: 'csv',
    description: 'Queue a check-in and access audit export for the front desk or compliance review.',
    filters: {
      scope: 'attendance',
      includeAccessAttempts: true,
      windowDays: 30,
    },
  },
  {
    key: 'ops-snapshot',
    label: 'Ops snapshot',
    exportType: 'ops_snapshot',
    fileFormat: 'json',
    description: 'Queue a compact JSON export for ops state, backup policy, and health-check tracking.',
    filters: {
      scope: 'ops',
      includeHealthChecks: true,
      includeQueuedExports: true,
    },
  },
];

export const DEFAULT_BACKUP_POLICY = {
  policyName: 'daily-database-backup',
  backupScope: 'database',
  backupMode: 'scheduled',
  retentionDays: 30,
  enabled: true,
  notes: '',
};

export const QUICK_LINKS = [
  {
    label: 'Production readiness',
    to: '/admin/production-readiness',
    helper: 'Final launch score, go-live gates, and rollout checklist.',
  },
  {
    label: 'Security center',
    to: '/admin/security',
    helper: 'Audit trails, overrides, and account restrictions.',
  },
  {
    label: 'Finance tools',
    to: '/admin/finance',
    helper: 'Renewals, liabilities, and payment follow-up.',
  },
  {
    label: 'Reports workspace',
    to: '/admin/reports',
    helper: 'Dashboards, insights, and operating summaries.',
  },
  {
    label: 'CRM pipeline',
    to: '/admin/crm',
    helper: 'Lead follow-up and pipeline hygiene.',
  },
];

export const formatDateTime = (value) => {
  if (!value) {
    return '—';
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch (error) {
    return value;
  }
};

export const formatBytes = (value) => {
  const bytes = Number(value);

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '—';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

export const formatDuration = (milliseconds) => {
  const duration = Number(milliseconds);

  if (!Number.isFinite(duration) || duration < 0) {
    return '—';
  }

  if (duration < 1000) {
    return `${duration} ms`;
  }

  if (duration < 60000) {
    return `${Math.round(duration / 1000)} sec`;
  }

  return `${Math.round(duration / 60000)} min`;
};

export const formatJsonSummary = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return 'No filters';
  }

  const entries = Object.entries(value)
    .slice(0, 3)
    .map(([key, entryValue]) => `${key}: ${String(entryValue)}`);

  if (!entries.length) {
    return 'No filters';
  }

  return entries.join(' • ');
};

export const normalizePolicyToForm = (policy) => ({
  policyName: policy?.policy_name || policy?.policyName || DEFAULT_BACKUP_POLICY.policyName,
  backupScope: policy?.backup_scope || policy?.backupScope || DEFAULT_BACKUP_POLICY.backupScope,
  backupMode: policy?.backup_mode || policy?.backupMode || DEFAULT_BACKUP_POLICY.backupMode,
  retentionDays: Number(policy?.retention_days || policy?.retentionDays || DEFAULT_BACKUP_POLICY.retentionDays),
  enabled: Boolean(policy?.enabled ?? DEFAULT_BACKUP_POLICY.enabled),
  notes: policy?.notes || '',
});

export const getStatusTone = (status) => {
  const normalized = String(status || 'unknown').toLowerCase();

  if (['completed', 'healthy', 'success', 'enabled', 'resolved'].includes(normalized)) {
    return 'success';
  }

  if (['running', 'investigating', 'processing', 'acknowledged'].includes(normalized)) {
    return 'info';
  }

  if (['warning', 'degraded', 'queued', 'unknown'].includes(normalized)) {
    return 'warning';
  }

  if (['failed', 'error', 'critical', 'disabled', 'open'].includes(normalized)) {
    return 'error';
  }

  return 'default';
};
