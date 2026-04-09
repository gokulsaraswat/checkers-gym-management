import React from 'react';
import {
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

export default function BackupPoliciesPanel({ policies }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Typography variant="h6" fontWeight={700}>
          Backup policies
        </Typography>
        <Typography variant="body2" color="text.secondary">
          These rows describe the recovery expectations you want the team to follow. They are not a
          replacement for actual infrastructure backups.
        </Typography>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Policy</TableCell>
              <TableCell>Scope</TableCell>
              <TableCell>Mode</TableCell>
              <TableCell>Retention</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {policies.map((policy) => (
              <TableRow key={policy.id || policy.policyName}>
                <TableCell>{policy.policy_name || policy.policyName}</TableCell>
                <TableCell>{policy.backup_scope || policy.backupScope}</TableCell>
                <TableCell>{policy.backup_mode || policy.backupMode}</TableCell>
                <TableCell>{policy.retention_days || policy.retentionDays} days</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={(policy.enabled ?? true) ? 'enabled' : 'disabled'}
                    color={(policy.enabled ?? true) ? 'success' : 'default'}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Stack>
    </Paper>
  );
}
