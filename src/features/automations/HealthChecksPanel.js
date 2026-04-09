import React from 'react';
import { Chip, Paper, Stack, Typography } from '@mui/material';

function StatusRow({ label, value, color = 'default' }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography variant="body2">{label}</Typography>
      <Chip size="small" label={value} color={color} />
    </Stack>
  );
}

export default function HealthChecksPanel({ snapshot }) {
  const latestBackup = snapshot?.latest_backup_status || 'unknown';
  const expiringMembers = snapshot?.expiring_members_next_7_days ?? 0;

  return (
    <Paper sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Typography variant="h6" fontWeight={700}>
          Health summary
        </Typography>

        <StatusRow
          label="Latest backup status"
          value={latestBackup}
          color={latestBackup === 'success' ? 'success' : latestBackup === 'failed' ? 'error' : 'default'}
        />

        <StatusRow
          label="Expiring members (7d)"
          value={String(expiringMembers)}
          color={expiringMembers > 0 ? 'warning' : 'success'}
        />

        <Typography variant="body2" color="text.secondary">
          Use the public health endpoint from this patch for basic uptime checks, then record deeper
          checks in the database when jobs or external providers fail.
        </Typography>
      </Stack>
    </Paper>
  );
}
