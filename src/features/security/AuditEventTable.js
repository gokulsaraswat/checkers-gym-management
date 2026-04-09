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

import EmptyStateCard from '../../components/common/EmptyStateCard';

const formatDateTime = (value) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const eventChipSx = {
  fontWeight: 700,
  backgroundColor: '#fff4e5',
  color: '#ed6c02',
};

const AuditEventTable = ({ events }) => {
  if (!events?.length) {
    return (
      <EmptyStateCard
        title="No audit events yet"
        description="Once admins use the security center, the most important permission and incident changes will appear here."
      />
    );
  }

  return (
    <Paper className="surface-card" sx={{ p: 3, borderRadius: 4 }}>
      <Stack spacing={2}>
        <Stack spacing={0.5}>
          <Typography variant="h6" fontWeight={800}>
            Audit event stream
          </Typography>
          <Typography variant="body2" color="text.secondary">
            High-signal admin actions, incident changes, and security policy updates.
          </Typography>
        </Stack>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>When</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Actor</TableCell>
              <TableCell>Entity</TableCell>
              <TableCell>Branch</TableCell>
              <TableCell>Summary</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id} hover>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(event.created_at)}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={event.action_key || 'event'}
                    sx={eventChipSx}
                  />
                </TableCell>
                <TableCell>
                  <Stack spacing={0.25}>
                    <Typography fontWeight={700}>{event.actor_full_name || 'Unknown user'}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {event.actor_email || 'No email'}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography fontWeight={700}>{event.entity_type || '—'}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {event.entity_id || '—'}
                  </Typography>
                </TableCell>
                <TableCell>{event.branch_name || 'Global'}</TableCell>
                <TableCell sx={{ maxWidth: 360 }}>
                  <Typography variant="body2" color="text.secondary">
                    {event.action_summary || 'No summary available.'}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Stack>
    </Paper>
  );
};

export default AuditEventTable;
