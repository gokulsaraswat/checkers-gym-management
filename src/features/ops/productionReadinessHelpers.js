export const defaultReadinessSnapshot = {
  active_backup_policies: 0,
  failed_job_runs_7d: 0,
  latest_backup_status: 'unknown',
  open_incident_count: 0,
  queued_export_count: 0,
  total_members: 0,
  unhealthy_health_checks: 0,
  unpaid_invoices: 0,
};

const SUCCESS_STATUSES = ['healthy', 'completed', 'success', 'resolved', 'enabled'];
const WARNING_STATUSES = ['warning', 'degraded', 'queued', 'unknown', 'investigating', 'acknowledged'];
const CRITICAL_STATUSES = ['critical', 'failed', 'error', 'down', 'open'];
const CRITICAL_SEVERITIES = ['critical', 'high'];
const RELEASE_NOTE_WINDOW_HOURS = 45 * 24;
const BACKUP_WINDOW_HOURS = 48;
const SCORE_WEIGHTS = {
  healthy: 100,
  warning: 68,
  critical: 28,
};

function normalize(value) {
  return String(value || 'unknown').trim().toLowerCase();
}

function pluralize(label, count) {
  if (count === 1) {
    return label;
  }

  if (label.endsWith('y')) {
    return `${label.slice(0, -1)}ies`;
  }

  return `${label}s`;
}

function hoursSince(value) {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.abs(Date.now() - timestamp) / (1000 * 60 * 60);
}

function getHealthCounts(healthChecks) {
  return healthChecks.reduce((counts, healthCheck) => {
    const status = normalize(healthCheck?.status);
    const severity = normalize(healthCheck?.severity);

    if (CRITICAL_STATUSES.includes(status) || CRITICAL_STATUSES.includes(severity)) {
      return {
        ...counts,
        unhealthy: counts.unhealthy + 1,
      };
    }

    if (WARNING_STATUSES.includes(status) || severity === 'warning') {
      return {
        ...counts,
        degraded: counts.degraded + 1,
      };
    }

    return {
      ...counts,
      healthy: counts.healthy + 1,
    };
  }, {
    tracked: healthChecks.length,
    healthy: 0,
    degraded: 0,
    unhealthy: 0,
  });
}

function getRecentSuccessfulBackup(backupRuns) {
  return backupRuns.find((run) => {
    const status = normalize(run?.run_status);
    const runTimestamp = run?.finished_at || run?.started_at || run?.created_at;
    return SUCCESS_STATUSES.includes(status) && hoursSince(runTimestamp) <= BACKUP_WINDOW_HOURS;
  }) || null;
}

function getCriticalIncidentCount(incidents) {
  return incidents.filter((incident) => {
    const severity = normalize(incident?.severity);
    const status = normalize(incident?.status);
    return status !== 'resolved' && CRITICAL_SEVERITIES.includes(severity);
  }).length;
}

function getOpenIncidentCount(incidents, snapshot) {
  if (incidents.length) {
    return incidents.filter((incident) => normalize(incident?.status) !== 'resolved').length;
  }

  return Number(snapshot?.open_incident_count || 0);
}

function getFailedJobRunsCount(snapshot, jobRuns) {
  const snapshotCount = Number(snapshot?.failed_job_runs_7d || 0);

  if (snapshotCount > 0) {
    return snapshotCount;
  }

  return jobRuns.filter((jobRun) => CRITICAL_STATUSES.includes(normalize(jobRun?.run_status))).length;
}

function getActiveBackupPolicyCount(snapshot, backupPolicies) {
  const enabledPolicies = backupPolicies.filter((policy) => policy?.enabled !== false);

  if (enabledPolicies.length) {
    return enabledPolicies.length;
  }

  return Number(snapshot?.active_backup_policies || 0);
}

function getHealthGateStatus(healthCounts) {
  if (healthCounts.unhealthy > 0) {
    return 'critical';
  }

  if (healthCounts.degraded > 0) {
    return 'warning';
  }

  return 'healthy';
}

function getHealthGateSummary(healthCounts) {
  if (healthCounts.unhealthy > 0) {
    return `${healthCounts.unhealthy} health checks require urgent attention before go-live.`;
  }

  if (healthCounts.degraded > 0) {
    return `${healthCounts.degraded} health checks are degraded and need an owner.`;
  }

  return 'Tracked health checks are healthy.';
}

function getBackupGateStatus(activeBackupPolicies, recentSuccessfulBackup) {
  if (activeBackupPolicies === 0) {
    return 'critical';
  }

  if (recentSuccessfulBackup) {
    return 'healthy';
  }

  return 'warning';
}

function getBackupGateSummary(activeBackupPolicies, recentSuccessfulBackup) {
  if (activeBackupPolicies === 0) {
    return 'No enabled backup policy is configured.';
  }

  if (recentSuccessfulBackup) {
    return 'A successful backup exists within the last 48 hours.';
  }

  return 'Backup policy exists, but a recent successful backup was not found.';
}

function getIncidentGateStatus(criticalIncidents, openIncidents) {
  if (criticalIncidents > 0) {
    return 'critical';
  }

  if (openIncidents > 0) {
    return 'warning';
  }

  return 'healthy';
}

function getIncidentGateSummary(criticalIncidents, openIncidents) {
  if (criticalIncidents > 0) {
    return `${criticalIncidents} high-severity incidents are still open.`;
  }

  if (openIncidents > 0) {
    return `${openIncidents} lower-severity incidents remain open.`;
  }

  return 'No open incidents are currently blocking launch.';
}

function getJobGateStatus(failedJobRuns) {
  if (failedJobRuns >= 3) {
    return 'critical';
  }

  if (failedJobRuns > 0) {
    return 'warning';
  }

  return 'healthy';
}

function getJobGateSummary(failedJobRuns) {
  if (failedJobRuns >= 3) {
    return `${failedJobRuns} job failures were recorded in the last 7 days.`;
  }

  if (failedJobRuns > 0) {
    return `${failedJobRuns} job failures need follow-up before launch.`;
  }

  return 'No failed job runs were detected in the last 7 days.';
}

function getReleaseGateStatus(latestReleaseNote, latestReleaseHours) {
  if (!latestReleaseNote) {
    return 'warning';
  }

  if (latestReleaseHours <= RELEASE_NOTE_WINDOW_HOURS) {
    return 'healthy';
  }

  return 'warning';
}

function getReleaseGateSummary(latestReleaseNote, latestReleaseHours) {
  if (!latestReleaseNote) {
    return 'No release note is published yet for launch communications.';
  }

  if (latestReleaseHours <= RELEASE_NOTE_WINDOW_HOURS) {
    return 'Release notes are fresh enough for launch communication.';
  }

  return 'Latest release note is stale; refresh the rollout summary before shipping.';
}

function getOpsGateStatus(criticalChecklistPending, totalChecklistPending) {
  if (criticalChecklistPending > 0) {
    return 'critical';
  }

  if (totalChecklistPending > 0) {
    return 'warning';
  }

  return 'healthy';
}

function getOpsGateSummary(criticalChecklistPending, totalChecklistPending) {
  if (criticalChecklistPending > 0) {
    return `${criticalChecklistPending} critical checklist items are still incomplete.`;
  }

  if (totalChecklistPending > 0) {
    return `${totalChecklistPending} checklist items remain open.`;
  }

  return 'Ops checklist is complete and front desk flow is ready.';
}

function createGate({ key, title, status, summary, evidence, actionTo, actionLabel = 'Open workspace' }) {
  return {
    key,
    title,
    status,
    summary,
    evidence,
    actionTo,
    actionLabel,
  };
}

function calculateReadinessScore(gates) {
  if (!gates.length) {
    return 0;
  }

  const weightedTotal = gates.reduce((total, gate) => total + (SCORE_WEIGHTS[gate.status] || 0), 0);
  return Math.max(0, Math.min(100, Math.round(weightedTotal / gates.length)));
}

export function humanizeStatusLabel(value) {
  return String(value || 'unknown').replace(/_/g, ' ');
}

export const buildProductionReadiness = ({
  snapshot = defaultReadinessSnapshot,
  backupPolicies = [],
  backupRuns = [],
  healthChecks = [],
  incidents = [],
  releaseNotes = [],
  checklist = [],
  jobRuns = [],
} = {}) => {
  let healthCounts = {
    tracked: Number(snapshot?.unhealthy_health_checks || 0),
    healthy: 0,
    degraded: 0,
    unhealthy: Number(snapshot?.unhealthy_health_checks || 0),
  };

  if (healthChecks.length) {
    healthCounts = getHealthCounts(healthChecks);
  }

  const criticalIncidents = getCriticalIncidentCount(incidents);
  const openIncidents = getOpenIncidentCount(incidents, snapshot);
  const failedJobRuns = getFailedJobRunsCount(snapshot, jobRuns);
  const activeBackupPolicies = getActiveBackupPolicyCount(snapshot, backupPolicies);
  const recentSuccessfulBackup = getRecentSuccessfulBackup(backupRuns);
  const latestBackup = backupRuns[0] || null;
  const latestReleaseNote = releaseNotes[0] || null;
  const latestJobRun = jobRuns[0] || null;
  const latestBackupStatus = normalize(snapshot?.latest_backup_status || latestBackup?.run_status || 'unknown');
  const latestReleaseHours = hoursSince(latestReleaseNote?.published_at || latestReleaseNote?.created_at);
  const criticalChecklistPending = checklist.filter((item) => !item?.completed && CRITICAL_SEVERITIES.includes(normalize(item?.priority))).length;
  const totalChecklistPending = checklist.filter((item) => !item?.completed).length;

  const gates = [
    createGate({
      key: 'system-health',
      title: 'System health',
      status: getHealthGateStatus(healthCounts),
      summary: getHealthGateSummary(healthCounts),
      evidence: [
        `${healthCounts.tracked || 0} total checks tracked`,
        `${healthCounts.healthy || 0} healthy`,
        `${healthCounts.degraded || 0} degraded`,
        `${healthCounts.unhealthy || 0} critical`,
      ],
      actionTo: '/admin/ops',
    }),
    createGate({
      key: 'backup-coverage',
      title: 'Backup coverage',
      status: getBackupGateStatus(activeBackupPolicies, recentSuccessfulBackup),
      summary: getBackupGateSummary(activeBackupPolicies, recentSuccessfulBackup),
      evidence: [
        `${activeBackupPolicies} active backup ${pluralize('policy', activeBackupPolicies)}`,
        `Latest backup status: ${humanizeStatusLabel(latestBackupStatus)}`,
        recentSuccessfulBackup ? 'Recent backup evidence is present.' : 'Record a fresh backup run before shipping.',
      ],
      actionTo: '/admin/ops',
    }),
    createGate({
      key: 'incident-response',
      title: 'Incident response',
      status: getIncidentGateStatus(criticalIncidents, openIncidents),
      summary: getIncidentGateSummary(criticalIncidents, openIncidents),
      evidence: [
        `${openIncidents} total open incidents`,
        `${criticalIncidents} critical or high-severity incidents`,
        openIncidents > 0 ? 'Assign an owner and ETA to every active incident.' : 'Incident queue is clear.',
      ],
      actionTo: '/admin/ops',
    }),
    createGate({
      key: 'automation-jobs',
      title: 'Automation and jobs',
      status: getJobGateStatus(failedJobRuns),
      summary: getJobGateSummary(failedJobRuns),
      evidence: [
        `${failedJobRuns} failed job runs in the last 7 days`,
        latestJobRun ? `Latest job: ${latestJobRun.job_name || latestJobRun.job_key || 'Scheduled job'}` : 'No job history recorded yet.',
        `${Number(snapshot?.queued_export_count || 0)} queued exports waiting in ops tooling`,
      ],
      actionTo: '/admin/ops',
    }),
    createGate({
      key: 'release-hygiene',
      title: 'Release hygiene',
      status: getReleaseGateStatus(latestReleaseNote, latestReleaseHours),
      summary: getReleaseGateSummary(latestReleaseNote, latestReleaseHours),
      evidence: [
        latestReleaseNote ? `Latest note: ${latestReleaseNote.title}` : 'No release notes recorded.',
        latestReleaseNote ? 'Staff communication surface is available.' : 'Publish a short admin/staff release note.',
        'Keep rollback ownership and scope written down before go-live.',
      ],
      actionTo: '/admin/blog',
    }),
    createGate({
      key: 'ops-checklist',
      title: 'Front-desk readiness',
      status: getOpsGateStatus(criticalChecklistPending, totalChecklistPending),
      summary: getOpsGateSummary(criticalChecklistPending, totalChecklistPending),
      evidence: [
        `${criticalChecklistPending} critical checklist items pending`,
        `${totalChecklistPending} total checklist items pending`,
        totalChecklistPending > 0 ? 'Finish checklist ownership before launch.' : 'Launch checklist is complete.',
      ],
      actionTo: '/admin/ops',
    }),
  ];

  const readinessScore = calculateReadinessScore(gates);
  const blockingGates = gates.filter((gate) => gate.status === 'critical').length;
  const warningGates = gates.filter((gate) => gate.status === 'warning').length;

  let recommendation = {
    severity: 'success',
    title: 'Production ready',
    body: 'Core launch gates are green across health, backups, incidents, automation, and communications.',
    nextSteps: [
      'Proceed inside the planned release window.',
      'Watch health checks, incidents, and jobs during the first hour after release.',
      'Publish a short release summary for staff and support visibility.',
    ],
  };

  if (blockingGates > 0) {
    recommendation = {
      severity: 'error',
      title: 'Not ready for production release',
      body: 'Critical launch blockers remain. Resolve the blocking gates below before pushing this build live.',
      nextSteps: [
        `Resolve the ${blockingGates} blocking ${pluralize('gate', blockingGates)} on this page.`,
        'Record a fresh backup and verify health checks again before go-live.',
        'Confirm release notes, incident ownership, and rollback contacts are current.',
      ],
    };
  } else if (warningGates > 1) {
    recommendation = {
      severity: 'warning',
      title: 'Release with caution',
      body: 'The major blockers are clear, but multiple warning signals still need an owner before or immediately after launch.',
      nextSteps: [
        `Assign owners to the ${warningGates} warning ${pluralize('gate', warningGates)}.`,
        'Keep the ops, security, and reports workspaces open during rollout.',
        'Track post-launch follow-ups inside the operations checklist.',
      ],
    };
  } else if (warningGates === 1) {
    recommendation = {
      severity: 'info',
      title: 'Ready with follow-up items',
      body: 'Launch can proceed, but one non-blocking readiness signal still needs active follow-up.',
      nextSteps: [
        'Proceed with the release while keeping an owner assigned to the warning signal.',
        'Monitor health checks and incident feed closely after deployment.',
        'Close out the warning item in the same release window when possible.',
      ],
    };
  }

  const checklistItems = [
    {
      label: 'Critical health checks are green',
      completed: healthCounts.unhealthy === 0,
      helper: healthCounts.unhealthy === 0
        ? `${healthCounts.tracked || 0} health checks are tracked for launch.`
        : `${healthCounts.unhealthy} critical health checks require attention.`,
    },
    {
      label: 'Recent successful backup is recorded',
      completed: Boolean(recentSuccessfulBackup),
      helper: recentSuccessfulBackup
        ? 'A successful backup exists within the last 48 hours.'
        : 'Record a fresh backup run before release.',
    },
    {
      label: 'No critical incidents are open',
      completed: criticalIncidents === 0,
      helper: criticalIncidents === 0
        ? `${openIncidents} total open incidents remain.`
        : `${criticalIncidents} critical or high-severity incidents remain open.`,
    },
    {
      label: 'Job automation is stable',
      completed: failedJobRuns === 0,
      helper: failedJobRuns === 0
        ? 'No failed job runs were recorded in the last 7 days.'
        : `${failedJobRuns} job failures need an owner before launch.`,
    },
    {
      label: 'Release notes and launch communication are fresh',
      completed: Boolean(latestReleaseNote) && latestReleaseHours <= RELEASE_NOTE_WINDOW_HOURS,
      helper: latestReleaseNote
        ? 'Latest release note is available for launch communication.'
        : 'Publish release notes so staff can see what changed.',
    },
    {
      label: 'Critical ops checklist items are complete',
      completed: criticalChecklistPending === 0,
      helper: criticalChecklistPending === 0
        ? `${totalChecklistPending} total checklist items remain open.`
        : `${criticalChecklistPending} critical checklist items still need completion.`,
    },
  ];

  return {
    score: readinessScore,
    gates,
    recommendation,
    checklistItems,
    highlights: {
      blockingGates,
      warningGates,
      openIncidents,
      criticalIncidents,
      healthChecksTracked: healthCounts.tracked || 0,
      healthyHealthChecks: healthCounts.healthy || 0,
      degradedChecks: healthCounts.degraded || 0,
      unhealthyChecks: healthCounts.unhealthy || 0,
      activeBackupPolicies,
      latestBackup,
      latestBackupStatus,
      latestReleaseNote,
      latestJobRun,
      failedJobRuns,
    },
  };
};
