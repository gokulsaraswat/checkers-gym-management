import React from 'react';
import {
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

function statusColor(status) {
  switch (status) {
    case 'success':
      return 'success';
    case 'failed':
      return 'error';
    case 'running':
      return 'warning';
    default:
      return 'default';
  }
}

export default function JobRunTable({ rows }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        Recent job runs
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Job</TableCell>
            <TableCell>Function</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Started</TableCell>
            <TableCell>Finished</TableCell>
            <TableCell>Duration</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6}>No recent job runs yet.</TableCell>
            </TableRow>
          ) : rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.job_name || row.job_key}</TableCell>
              <TableCell>{row.function_name}</TableCell>
              <TableCell>
                <Chip size="small" label={row.run_status} color={statusColor(row.run_status)} />
              </TableCell>
              <TableCell>{row.started_at ? new Date(row.started_at).toLocaleString() : '-'}</TableCell>
              <TableCell>{row.finished_at ? new Date(row.finished_at).toLocaleString() : '-'}</TableCell>
              <TableCell>{row.duration_ms ? `${row.duration_ms} ms` : '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}
