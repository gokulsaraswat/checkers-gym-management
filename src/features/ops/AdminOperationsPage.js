import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import { Link as RouterLink } from 'react-router-dom';

import AsyncScreenState from '../../components/common/AsyncScreenState';
import { dashboardGridColumns, layoutGutters } from '../../theme/responsiveTokens';
import {
  fetchOpsToolingSnapshot,
  listBackupPolicies,
  listOpenOpsIncidents,
  listOpsChecklist,
  listOpsExportJobs,
  listRecentBackupRuns,
  listRecentJobRuns,
  listReleaseNotes,
  listSystemHealthChecks,
  queueOpsExportJob,
  recordBackupRun,
  saveBackupPolicy,
  seedOpsToolingDefaults,
  toggleOpsChecklistItem,
} from './opsClient';
import { formatDateTime, QUICK_LINKS } from './opsHelpers';
import MetricCard from './components/MetricCard';
import OpsBackupPanel from './components/OpsBackupPanel';
import OpsExportQueuePanel from './components/OpsExportQueuePanel';
import OpsHealthPanel from './components/OpsHealthPanel';
import SectionCard from './components/SectionCard';
import StatusChip from './components/StatusChip';

const emptySnapshot = {
  active_backup_policies: 0,
  failed_job_runs_7d: 0,
  latest_backup_status: 'unknown',
  open_incident_count: 0,
  queued_export_count: 0,
  total_members: 0,
  unhealthy_health_checks: 0,
  unpaid_invoices: 0,
};

export default function AdminOperationsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const [checklist, setChecklist] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [releaseNotes, setReleaseNotes] = useState([]);
  const [exportJobs, setExportJobs] = useState([]);
  const [backupPolicies, setBackupPolicies] = useState([]);
  const [backupRuns, setBackupRuns] = useState([]);
  const [jobRuns, setJobRuns] = useState([]);
  const [healthChecks, setHealthChecks] = useState([]);
  const [queueingKey, setQueueingKey] = useState('');
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [loggingPolicyName, setLoggingPolicyName] = useState('');

  const hydrate = useCallback(async ({ background = false } = {}) => {
    if (background) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const [
        nextSnapshot,
        nextChecklist,
        nextIncidents,
        nextReleaseNotes,
        nextExportJobs,
        nextPolicies,
        nextBackupRuns,
        nextJobRuns,
        nextHealthChecks,
      ] = await Promise.all([
        fetchOpsToolingSnapshot(),
        listOpsChecklist(),
        listOpenOpsIncidents(),
        listReleaseNotes(6),
        listOpsExportJobs(12),
        listBackupPolicies(),
        listRecentBackupRuns(10),
        listRecentJobRuns(10),
        listSystemHealthChecks(),
      ]);

      setSnapshot(nextSnapshot || emptySnapshot);
      setChecklist(nextChecklist || []);
      setIncidents(nextIncidents || []);
      setReleaseNotes(nextReleaseNotes || []);
      setExportJobs(nextExportJobs || []);
      setBackupPolicies(nextPolicies || []);
      setBackupRuns(nextBackupRuns || []);
      setJobRuns(nextJobRuns || []);
      setHealthChecks(nextHealthChecks || []);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load the backup, export, and operations workspace.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const checklistCompletionRate = useMemo(() => {
    if (!checklist.length) {
      return 0;
    }

    const completedCount = checklist.filter((item) => item.completed).length;
    return Math.round((completedCount / checklist.length) * 100);
  }, [checklist]);

  const metrics = useMemo(() => ([
    {
      label: 'Total members',
      value: snapshot.total_members ?? 0,
      helper: 'Member profiles currently stored in the app.',
    },
    {
      label: 'Open incidents',
      value: snapshot.open_incident_count ?? incidents.length,
      helper: 'Operational issues still marked as open or investigating.',
    },
    {
      label: 'Queued exports',
      value: snapshot.queued_export_count ?? 0,
      helper: 'Export jobs waiting to run or still processing.',
    },
    {
      label: 'Backup policies',
      value: snapshot.active_backup_policies ?? backupPolicies.filter((item) => item.enabled).length,
      helper: 'Enabled retention policies recorded for the operator team.',
    },
    {
      label: 'Failed jobs (7d)',
      value: snapshot.failed_job_runs_7d ?? 0,
      helper: 'Recent failures written into scheduled job history.',
    },
    {
      label: 'Health alerts',
      value: snapshot.unhealthy_health_checks ?? 0,
      helper: 'Checks not currently marked healthy.',
    },
  ]), [backupPolicies, incidents.length, snapshot]);

  const isEmpty = useMemo(() => {
    const hasSnapshotSignal = [
      snapshot.total_members,
      snapshot.unpaid_invoices,
      snapshot.open_incident_count,
      snapshot.queued_export_count,
      snapshot.active_backup_policies,
      snapshot.failed_job_runs_7d,
      snapshot.unhealthy_health_checks,
    ].some((value) => Number(value) > 0) || snapshot.latest_backup_status !== 'unknown';

    return !hasSnapshotSignal
      && !checklist.length
      && !incidents.length
      && !releaseNotes.length
      && !exportJobs.length
      && !backupPolicies.length
      && !backupRuns.length
      && !jobRuns.length
      && !healthChecks.length;
  }, [
    backupPolicies.length,
    backupRuns.length,
    checklist.length,
    exportJobs.length,
    healthChecks.length,
    incidents.length,
    jobRuns.length,
    releaseNotes.length,
    snapshot.active_backup_policies,
    snapshot.failed_job_runs_7d,
    snapshot.latest_backup_status,
    snapshot.open_incident_count,
    snapshot.queued_export_count,
    snapshot.total_members,
    snapshot.unhealthy_health_checks,
    snapshot.unpaid_invoices,
  ]);

  const handleChecklistToggle = async (itemId, completed) => {
    const previousChecklist = checklist;

    setChecklist((current) => current.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          completed,
        };
      }

      return item;
    }));

    setFeedback(null);

    try {
      await toggleOpsChecklistItem(itemId, completed);
    } catch (toggleError) {
      setChecklist(previousChecklist);
      setFeedback({
        type: 'error',
        message: toggleError.message || 'Unable to update the ops checklist item.',
      });
    }
  };

  const handleQueueExport = async (preset) => {
    setQueueingKey(preset.key);
    setFeedback(null);

    try {
      await queueOpsExportJob({
        exportType: preset.exportType,
        exportLabel: preset.label,
        fileFormat: preset.fileFormat,
        filters: preset.filters,
        notes: preset.description,
      });

      setFeedback({
        type: 'success',
        message: `${preset.label} has been queued in the export center.`,
      });

      await hydrate({ background: true });
    } catch (queueError) {
      setFeedback({
        type: 'error',
        message: queueError.message || 'Unable to queue the export job.',
      });
    } finally {
      setQueueingKey('');
    }
  };

  const handleSavePolicy = async (policy) => {
    setSavingPolicy(true);
    setFeedback(null);

    try {
      await saveBackupPolicy(policy);
      setFeedback({
        type: 'success',
        message: `Saved backup policy “${policy.policyName}”.`,
      });
      await hydrate({ background: true });
    } catch (saveError) {
      setFeedback({
        type: 'error',
        message: saveError.message || 'Unable to save the backup policy.',
      });
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleLogPolicyRun = async (policy) => {
    const policyName = policy.policy_name || policy.policyName || 'backup-policy';
    const safeLocationKey = String(policyName).trim().replace(/\s+/g, '-').toLowerCase();

    setLoggingPolicyName(policyName);
    setFeedback(null);

    try {
      await recordBackupRun({
        policyId: policy.id || null,
        policyName,
        runStatus: 'completed',
        runSource: 'manual',
        backupLocation: `manual://${safeLocationKey}`,
        notes: 'Manual verification recorded from the Patch 39 admin ops workspace.',
      });

      setFeedback({
        type: 'success',
        message: `Logged a successful backup run for “${policyName}”.`,
      });

      await hydrate({ background: true });
    } catch (runError) {
      setFeedback({
        type: 'error',
        message: runError.message || 'Unable to log the backup run.',
      });
    } finally {
      setLoggingPolicyName('');
    }
  };

  const handleSeedDefaults = async () => {
    setRefreshing(true);
    setFeedback(null);

    try {
      await seedOpsToolingDefaults();
      setFeedback({
        type: 'success',
        message: 'Seeded default backup policies, health checks, and scheduled jobs.',
      });
      await hydrate({ background: true });
    } catch (seedError) {
      setFeedback({
        type: 'error',
        message: seedError.message || 'Unable to seed the operations defaults.',
      });
      setRefreshing(false);
    }
  };

  return (
    <Stack spacing={3} sx={{ px: layoutGutters, py: { xs: 2, md: 3 } }}>
      <Stack
        alignItems={{ xs: 'flex-start', lg: 'center' }}
        direction={{ xs: 'column', lg: 'row' }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Backup, export, and ops tools
          </Typography>
          <Typography color="text.secondary" variant="body1">
            Queue exports, track backup policy coverage, review platform health, and keep operational follow-up visible from one admin workspace.
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
          <Button
            variant="outlined"
            onClick={handleSeedDefaults}
            startIcon={<BoltRoundedIcon />}
            sx={{ textTransform: 'none', borderRadius: 999 }}
          >
            {refreshing ? 'Working…' : 'Seed defaults'}
          </Button>
          <Button
            variant="outlined"
            onClick={() => hydrate({ background: true })}
            startIcon={<AutorenewRoundedIcon />}
            sx={{ textTransform: 'none', borderRadius: 999 }}
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
        </Stack>
      </Stack>

      {feedback ? <Alert severity={feedback.type}>{feedback.message}</Alert> : null}

      <AsyncScreenState
        loading={loading}
        error={error}
        onRetry={() => hydrate()}
        loadingLabel="Loading ops toolkit…"
        empty={isEmpty}
        title="Run the Patch 39 migration to enable ops tooling"
        description="The workspace is ready, but the backup, export, and health-check tables or seed records are still empty."
        emptyActionLabel="Seed defaults"
        onEmptyAction={handleSeedDefaults}
      >
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: dashboardGridColumns,
          }}
        >
          {metrics.map((metric) => (
            <MetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              helper={metric.helper}
            />
          ))}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', xl: '1.08fr 0.92fr' },
          }}
        >
          <Stack spacing={2}>
            <OpsExportQueuePanel
              jobs={exportJobs}
              onQueueExport={handleQueueExport}
              queueingKey={queueingKey}
            />

            <SectionCard
              title="Launch and daily ops checklist"
              subtitle="Keep the operator checklist visible so the team can close out deployment and routine admin tasks confidently."
              actions={<StatusChip status={checklistCompletionRate === 100 ? 'completed' : 'running'} size="medium" />}
            >
              <List disablePadding>
                {checklist.length ? checklist.map((item, index) => (
                  <Box key={item.id}>
                    <ListItem
                      disableGutters
                      secondaryAction={(
                        <Switch
                          checked={Boolean(item.completed)}
                          edge="end"
                          onChange={(event) => handleChecklistToggle(item.id, event.target.checked)}
                        />
                      )}
                    >
                      <ListItemText
                        primary={item.title}
                        secondary={item.description || `Priority: ${item.priority || 'normal'}`}
                        primaryTypographyProps={{
                          sx: item.completed
                            ? { textDecoration: 'line-through', color: 'text.secondary' }
                            : undefined,
                        }}
                      />
                    </ListItem>
                    {index < checklist.length - 1 ? <Divider component="li" /> : null}
                  </Box>
                )) : (
                  <Typography color="text.secondary" variant="body2">
                    No checklist items yet. Earlier launch-readiness items can still live here alongside ongoing admin operations follow-up.
                  </Typography>
                )}
              </List>
            </SectionCard>

            <SectionCard
              title="Release notes and operator context"
              subtitle="Keep short launch notes, production updates, or admin handover summaries visible in the same workspace."
            >
              <Stack spacing={1.5}>
                {releaseNotes.length ? releaseNotes.map((note) => (
                  <Box key={note.id}>
                    <Typography fontWeight={700}>{note.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {note.summary || 'No summary provided.'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Published {formatDateTime(note.published_at)}
                    </Typography>
                  </Box>
                )) : (
                  <Typography color="text.secondary" variant="body2">
                    No release notes found yet. Use this section for deployment notes, known issues, or admin handoff reminders.
                  </Typography>
                )}
              </Stack>
            </SectionCard>
          </Stack>

          <Stack spacing={2}>
            <OpsBackupPanel
              policies={backupPolicies}
              runs={backupRuns}
              saving={savingPolicy}
              loggingPolicyName={loggingPolicyName}
              onSavePolicy={handleSavePolicy}
              onLogPolicyRun={handleLogPolicyRun}
            />

            <OpsHealthPanel healthChecks={healthChecks} jobRuns={jobRuns} />

            <SectionCard
              title="Incidents and quick links"
              subtitle="Keep high-signal issues visible and jump into the admin surfaces most likely to need attention next."
              actions={<StatusChip status={incidents.length ? 'open' : snapshot.latest_backup_status || 'healthy'} size="medium" />}
            >
              <Stack spacing={2}>
                <Stack spacing={1.5}>
                  {incidents.length ? incidents.map((incident) => (
                    <Box key={incident.id}>
                      <Stack direction="row" justifyContent="space-between" spacing={2}>
                        <Typography sx={{ fontWeight: 600 }}>{incident.title}</Typography>
                        <StatusChip status={incident.status || incident.severity || 'open'} />
                      </Stack>
                      <Typography color="text.secondary" variant="body2">
                        {incident.summary || 'No summary provided.'}
                      </Typography>
                      <Typography color="text.secondary" variant="caption">
                        Updated {formatDateTime(incident.updated_at)}
                      </Typography>
                    </Box>
                  )) : (
                    <Alert severity="success" variant="outlined">
                      No active incidents are recorded right now.
                    </Alert>
                  )}
                </Stack>

                <Divider />

                <Stack spacing={1.25}>
                  {QUICK_LINKS.map((link) => (
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
              </Stack>
            </SectionCard>
          </Stack>
        </Box>
      </AsyncScreenState>
    </Stack>
  );
}
