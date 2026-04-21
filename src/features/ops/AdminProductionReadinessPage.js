import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  CircularProgress,
  Divider,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import { Link as RouterLink } from 'react-router-dom';

import { PATHS } from '../../app/paths';
import { dashboardGridColumns, layoutGutters } from '../../theme/responsiveTokens';
import MetricCard from './components/MetricCard';
import ReadinessChecklistCard from './components/ReadinessChecklistCard';
import ReadinessGateCard from './components/ReadinessGateCard';
import SectionCard from './components/SectionCard';
import StatusChip from './components/StatusChip';
import {
  fetchOpsToolingSnapshot,
  listBackupPolicies,
  listOpenOpsIncidents,
  listOpsChecklist,
  listRecentBackupRuns,
  listRecentJobRuns,
  listReleaseNotes,
  listSystemHealthChecks,
} from './opsClient';
import { formatDateTime, formatDuration } from './opsHelpers';
import {
  buildProductionReadiness,
  defaultReadinessSnapshot,
  humanizeStatusLabel,
} from './productionReadinessHelpers';

const launchLinks = [
  {
    label: 'Operations workspace',
    to: PATHS.adminOps,
    helper: 'Backups, exports, incidents, and system health checks.',
  },
  {
    label: 'Security center',
    to: PATHS.adminSecurity,
    helper: 'Audit trails, restrictions, and sensitive overrides.',
  },
  {
    label: 'Reports workspace',
    to: PATHS.adminReports,
    helper: 'KPIs, activity trends, and executive-facing summaries.',
  },
  {
    label: 'Access controls',
    to: PATHS.adminAccess,
    helper: 'Entry points, credentials, and hardware-connected surfaces.',
  },
];

function getSettledValue(result, fallbackValue) {
  return result?.status === 'fulfilled' ? result.value : fallbackValue;
}

function getHealthSummaryStatus(highlights) {
  if (highlights.unhealthyChecks > 0) {
    return 'critical';
  }

  if (highlights.degradedChecks > 0) {
    return 'warning';
  }

  return 'healthy';
}

function getLatestBackupSummary(latestBackup) {
  if (!latestBackup) {
    return 'No backup runs have been recorded yet.';
  }

  return `${formatDateTime(latestBackup.finished_at || latestBackup.started_at || latestBackup.created_at)} • ${latestBackup.policy_name || 'Manual backup'}`;
}

function getLatestJobSummary(latestJobRun) {
  if (!latestJobRun) {
    return 'No job history has been recorded yet.';
  }

  const durationText = latestJobRun.duration_ms ? ` • ${formatDuration(latestJobRun.duration_ms)}` : '';

  return `${latestJobRun.job_name || latestJobRun.job_key || 'Scheduled job'} • ${formatDateTime(latestJobRun.finished_at || latestJobRun.started_at || latestJobRun.created_at)}${durationText}`;
}

function getLatestReleaseSummary(latestReleaseNote) {
  if (!latestReleaseNote) {
    return 'No release notes are published yet.';
  }

  return `${latestReleaseNote.title} • ${formatDateTime(latestReleaseNote.published_at || latestReleaseNote.created_at)}`;
}

export default function AdminProductionReadinessPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [snapshot, setSnapshot] = useState(defaultReadinessSnapshot);
  const [backupPolicies, setBackupPolicies] = useState([]);
  const [backupRuns, setBackupRuns] = useState([]);
  const [healthChecks, setHealthChecks] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [releaseNotes, setReleaseNotes] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [jobRuns, setJobRuns] = useState([]);

  const hydrate = useCallback(async ({ background = false } = {}) => {
    if (background) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    const requests = [
      fetchOpsToolingSnapshot(),
      listBackupPolicies(),
      listRecentBackupRuns(8),
      listSystemHealthChecks(),
      listOpenOpsIncidents(),
      listReleaseNotes(6),
      listOpsChecklist(),
      listRecentJobRuns(8),
    ];

    const results = await Promise.allSettled(requests);
    const [
      snapshotResult,
      backupPoliciesResult,
      backupRunsResult,
      healthChecksResult,
      incidentsResult,
      releaseNotesResult,
      checklistResult,
      jobRunsResult,
    ] = results;

    setSnapshot(getSettledValue(snapshotResult, defaultReadinessSnapshot) || defaultReadinessSnapshot);
    setBackupPolicies(getSettledValue(backupPoliciesResult, []) || []);
    setBackupRuns(getSettledValue(backupRunsResult, []) || []);
    setHealthChecks(getSettledValue(healthChecksResult, []) || []);
    setIncidents(getSettledValue(incidentsResult, []) || []);
    setReleaseNotes(getSettledValue(releaseNotesResult, []) || []);
    setChecklist(getSettledValue(checklistResult, []) || []);
    setJobRuns(getSettledValue(jobRunsResult, []) || []);

    const failedRequests = results.filter((result) => result.status === 'rejected');

    if (failedRequests.length) {
      const firstFailure = failedRequests[0];
      setError(firstFailure.reason?.message || 'Some readiness signals could not be loaded. Fallback values are shown where possible.');
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const readiness = useMemo(() => buildProductionReadiness({
    snapshot,
    backupPolicies,
    backupRuns,
    healthChecks,
    incidents,
    releaseNotes,
    checklist,
    jobRuns,
  }), [backupPolicies, backupRuns, checklist, healthChecks, incidents, jobRuns, releaseNotes, snapshot]);

  const latestBackup = readiness.highlights.latestBackup;
  const latestJobRun = readiness.highlights.latestJobRun;
  const latestReleaseNote = readiness.highlights.latestReleaseNote;
  const healthSummaryStatus = getHealthSummaryStatus(readiness.highlights);

  if (loading) {
    return (
      <Box sx={{ px: layoutGutters, py: { xs: 3, md: 4 } }}>
        <Stack alignItems="center" spacing={2.5} sx={{ py: 8 }}>
          <CircularProgress size={34} />
          <Typography variant="h6">Loading production readiness...</Typography>
          <Typography color="text.secondary" variant="body2">
            Checking launch gates, operations signals, and release evidence.
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ px: layoutGutters, py: { xs: 2.5, md: 3.5 } }}>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          spacing={2}
          alignItems={{ xs: 'flex-start', md: 'center' }}
        >
          <Stack spacing={0.75}>
            <Typography variant="h4">Production readiness</Typography>
            <Typography color="text.secondary" variant="body2">
              Final go-live score, launch gates, and operational evidence before promoting the release.
            </Typography>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
            <Button
              component={RouterLink}
              to={PATHS.adminOps}
              variant="outlined"
              endIcon={<LaunchRoundedIcon />}
              sx={{ textTransform: 'none' }}
            >
              Open ops workspace
            </Button>
            <Button
              onClick={() => hydrate({ background: true })}
              variant="contained"
              startIcon={<AutorenewRoundedIcon />}
              disabled={refreshing}
              sx={{ textTransform: 'none' }}
            >
              {refreshing ? 'Refreshing signals...' : 'Refresh signals'}
            </Button>
          </Stack>
        </Stack>

        {refreshing ? <LinearProgress /> : null}

        {error ? (
          <Alert severity="warning" variant="outlined">
            {error}
          </Alert>
        ) : null}

        <SectionCard
          title="Launch recommendation"
          subtitle="Use this score as the final admin-facing release check before pushing to production."
        >
          <Stack spacing={2}>
            <Alert severity={readiness.recommendation.severity}>
              <AlertTitle>{readiness.recommendation.title}</AlertTitle>
              <Typography component="div" variant="body2" sx={{ mb: 1 }}>
                {readiness.recommendation.body}
              </Typography>
              <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2.5 }}>
                {readiness.recommendation.nextSteps.map((step) => (
                  <Typography component="li" key={step} variant="body2">
                    {step}
                  </Typography>
                ))}
              </Stack>
            </Alert>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Typography variant="body2">Readiness score</Typography>
                <Typography sx={{ fontWeight: 700 }} variant="body2">
                  {readiness.score}%
                </Typography>
              </Stack>
              <LinearProgress
                value={readiness.score}
                variant="determinate"
                color={readiness.recommendation.severity}
                sx={{ height: 10, borderRadius: 999 }}
              />
              <Typography color="text.secondary" variant="caption">
                {readiness.highlights.blockingGates} blocking gates • {readiness.highlights.warningGates} warnings • {readiness.highlights.openIncidents} open incidents
              </Typography>
            </Stack>
          </Stack>
        </SectionCard>

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: dashboardGridColumns,
          }}
        >
          <MetricCard
            label="Readiness score"
            value={`${readiness.score}%`}
            helper="Composite signal from health, backups, incidents, automation, and comms."
          />
          <MetricCard
            label="Blocking gates"
            value={readiness.highlights.blockingGates}
            helper="Critical gates that should stop production promotion."
          />
          <MetricCard
            label="Open incidents"
            value={readiness.highlights.openIncidents}
            helper="Active incidents that still need ownership or resolution."
          />
          <MetricCard
            label="Failed jobs (7d)"
            value={readiness.highlights.failedJobRuns}
            helper="Scheduler and automation failures captured in the last week."
          />
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
          }}
        >
          {readiness.gates.map((gate) => (
            <ReadinessGateCard
              key={gate.key}
              title={gate.title}
              status={gate.status}
              summary={gate.summary}
              evidence={gate.evidence}
              actionTo={gate.actionTo}
              actionLabel={gate.actionLabel}
            />
          ))}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', xl: 'repeat(2, minmax(0, 1fr))' },
          }}
        >
          <ReadinessChecklistCard items={readiness.checklistItems} />

          <SectionCard
            title="Latest launch signals"
            subtitle="Recent operational evidence that informs the current release posture."
          >
            <Stack divider={<Divider flexItem />} spacing={1.5}>
              <Stack alignItems={{ xs: 'flex-start', sm: 'center' }} direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
                <Stack spacing={0.35}>
                  <Typography sx={{ fontWeight: 600 }}>Latest backup run</Typography>
                  <Typography color="text.secondary" variant="body2">
                    {getLatestBackupSummary(latestBackup)}
                  </Typography>
                </Stack>
                <StatusChip status={latestBackup?.run_status || readiness.highlights.latestBackupStatus} />
              </Stack>

              <Stack alignItems={{ xs: 'flex-start', sm: 'center' }} direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
                <Stack spacing={0.35}>
                  <Typography sx={{ fontWeight: 600 }}>Latest scheduled job</Typography>
                  <Typography color="text.secondary" variant="body2">
                    {getLatestJobSummary(latestJobRun)}
                  </Typography>
                </Stack>
                <StatusChip status={latestJobRun?.run_status || 'unknown'} />
              </Stack>

              <Stack alignItems={{ xs: 'flex-start', sm: 'center' }} direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
                <Stack spacing={0.35}>
                  <Typography sx={{ fontWeight: 600 }}>Latest release note</Typography>
                  <Typography color="text.secondary" variant="body2">
                    {getLatestReleaseSummary(latestReleaseNote)}
                  </Typography>
                </Stack>
                <StatusChip status={latestReleaseNote ? 'completed' : 'warning'} />
              </Stack>

              <Stack alignItems={{ xs: 'flex-start', sm: 'center' }} direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
                <Stack spacing={0.35}>
                  <Typography sx={{ fontWeight: 600 }}>Health-check summary</Typography>
                  <Typography color="text.secondary" variant="body2">
                    {`${readiness.highlights.healthyHealthChecks}/${readiness.highlights.healthChecksTracked || 0} healthy • ${readiness.highlights.degradedChecks} degraded • ${readiness.highlights.unhealthyChecks} critical`}
                  </Typography>
                </Stack>
                <StatusChip status={healthSummaryStatus} />
              </Stack>
            </Stack>
          </SectionCard>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', xl: 'repeat(2, minmax(0, 1fr))' },
          }}
        >
          <SectionCard
            title="Recent release notes"
            subtitle="Publishing rollout notes keeps staff communication and rollback ownership visible."
          >
            <Stack spacing={1.5}>
              {releaseNotes.length ? releaseNotes.map((note) => (
                <Box key={note.id || note.title}>
                  <Typography sx={{ fontWeight: 600 }}>{note.title}</Typography>
                  <Typography color="text.secondary" variant="body2">
                    {note.summary || 'No summary was provided for this note.'}
                  </Typography>
                  <Typography color="text.secondary" variant="caption">
                    Published {formatDateTime(note.published_at || note.created_at)}
                  </Typography>
                </Box>
              )) : (
                <Alert severity="info" variant="outlined">
                  Publish a short release note before the go-live window so staff and admins can see what changed.
                </Alert>
              )}
            </Stack>
          </SectionCard>

          <SectionCard
            title="Launch workspaces"
            subtitle="Keep the nearby admin surfaces open during the final release window."
          >
            <Stack spacing={1.25}>
              {launchLinks.map((link) => (
                <Button
                  key={link.to}
                  component={RouterLink}
                  to={link.to}
                  variant="outlined"
                  endIcon={<LaunchRoundedIcon />}
                  sx={{
                    justifyContent: 'space-between',
                    textTransform: 'none',
                    borderRadius: 3,
                    px: 1.5,
                    py: 1.1,
                  }}
                >
                  <Stack alignItems="flex-start" spacing={0.25} sx={{ textAlign: 'left' }}>
                    <Typography component="span" fontWeight={700}>
                      {link.label}
                    </Typography>
                    <Typography component="span" variant="caption" color="text.secondary">
                      {link.helper}
                    </Typography>
                  </Stack>
                </Button>
              ))}
            </Stack>
          </SectionCard>
        </Box>

        <Typography color="text.secondary" variant="caption">
          Latest backup signal: {humanizeStatusLabel(readiness.highlights.latestBackupStatus)} • Active backup policies: {readiness.highlights.activeBackupPolicies}
        </Typography>
      </Stack>
    </Box>
  );
}
