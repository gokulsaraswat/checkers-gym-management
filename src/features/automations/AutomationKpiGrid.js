import React from 'react';
import { Grid, Paper, Skeleton, Stack, Typography } from '@mui/material';

function MetricCard({ label, value, helper, loading }) {
  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Stack spacing={1}>
        <Typography variant="overline" color="text.secondary">
          {label}
        </Typography>
        {loading ? <Skeleton variant="text" width={120} height={40} /> : (
          <Typography variant="h4" fontWeight={700}>
            {value}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary">
          {helper}
        </Typography>
      </Stack>
    </Paper>
  );
}

export default function AutomationKpiGrid({ snapshot, loading }) {
  const metrics = [
    {
      label: 'Active jobs',
      value: snapshot?.active_jobs ?? 0,
      helper: 'Enabled scheduled jobs currently registered in the app.',
    },
    {
      label: 'Failed runs (7d)',
      value: snapshot?.failed_runs_last_7_days ?? 0,
      helper: 'Use this to spot silent automation failures.',
    },
    {
      label: 'Backup policies',
      value: snapshot?.active_backup_policies ?? 0,
      helper: 'Configured backup policy rows stored in Supabase.',
    },
    {
      label: 'Unpaid invoices',
      value: snapshot?.unpaid_invoices ?? 0,
      helper: 'Pulled into the snapshot if billing tables already exist.',
    },
  ];

  return (
    <Grid container spacing={2}>
      {metrics.map((metric) => (
        <Grid item xs={12} sm={6} xl={3} key={metric.label}>
          <MetricCard {...metric} loading={loading} />
        </Grid>
      ))}
    </Grid>
  );
}
