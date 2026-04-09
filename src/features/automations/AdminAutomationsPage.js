import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import AutomationKpiGrid from './AutomationKpiGrid';
import BackupPoliciesPanel from './BackupPoliciesPanel';
import JobRunTable from './JobRunTable';
import HealthChecksPanel from './HealthChecksPanel';
import {
  getAutomationSnapshot,
  listBackupPolicies,
  listRecentJobRuns,
  saveBackupPolicy,
} from './automationsClient';

const defaultPolicy = {
  policyName: 'daily-app-backup',
  backupScope: 'database-and-storage',
  backupMode: 'scheduled',
  retentionDays: 30,
  enabled: true,
  notes: '',
};

export default function AdminAutomationsPage() {
  const [snapshot, setSnapshot] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [jobRuns, setJobRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  async function loadPage() {
    setLoading(true);
    setFeedback(null);
    try {
      const [nextSnapshot, nextPolicies, nextRuns] = await Promise.all([
        getAutomationSnapshot(),
        listBackupPolicies(),
        listRecentJobRuns(25),
      ]);
      setSnapshot(nextSnapshot);
      setPolicies(nextPolicies);
      setJobRuns(nextRuns);
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error?.message || 'Failed to load automation workspace.',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, []);

  const resolvedPolicies = useMemo(() => {
    if (policies.length > 0) return policies;
    return [defaultPolicy];
  }, [policies]);

  async function handleQuickSavePolicy() {
    setFeedback(null);
    try {
      await saveBackupPolicy(defaultPolicy);
      setFeedback({
        type: 'success',
        message: 'Default backup policy saved.',
      });
      await loadPage();
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error?.message || 'Failed to save backup policy.',
      });
    }
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack spacing={2}>
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', lg: 'center' }}
          spacing={2}
        >
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Automations and Platform Monitoring
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Track backup policies, scheduled jobs, and platform health from one admin workspace.
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button variant="outlined" onClick={loadPage}>
              Refresh
            </Button>
            <Button variant="contained" onClick={handleQuickSavePolicy}>
              Seed default backup policy
            </Button>
          </Stack>
        </Stack>

        {feedback ? <Alert severity={feedback.type}>{feedback.message}</Alert> : null}

        <AutomationKpiGrid snapshot={snapshot} loading={loading} />

        <Grid container spacing={2}>
          <Grid item xs={12} xl={7}>
            <Stack spacing={2}>
              <BackupPoliciesPanel policies={resolvedPolicies} />
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Operator reminders
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  This patch gives you policy tracking and job visibility. Real backup execution still
                  needs your database backup provider, storage replication plan, and an external or
                  platform-level scheduler to invoke the Edge Functions on time.
                </Typography>
              </Paper>
            </Stack>
          </Grid>

          <Grid item xs={12} xl={5}>
            <Stack spacing={2}>
              <HealthChecksPanel snapshot={snapshot} />
            </Stack>
          </Grid>
        </Grid>

        <JobRunTable rows={jobRuns} />
      </Stack>
    </Box>
  );
}
