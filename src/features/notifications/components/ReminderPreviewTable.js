import React from 'react';
import {
  Box,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

import {
  buildReminderPreviewSummary,
  formatNotificationDate,
  getDeliveryChannelLabel,
  getReminderTypeLabel,
} from '../notificationsHelpers';

const ReminderPreviewTable = ({ rows, loading }) => {
  const summary = buildReminderPreviewSummary(rows);
  const channelEntries = Object.entries(summary.byChannel || {});

  return (
    <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, height: '100%' }}>
      <Stack spacing={2.5}>
        <Stack spacing={0.75}>
          <Typography color="#ff2625" fontWeight={700}>
            Reminder preview
          </Typography>
          <Typography variant="h5" fontWeight={800}>
            Review recipients before you send
          </Typography>
          <Typography color="text.secondary">
            The preview uses the saved rule configuration and shows who currently matches the reminder conditions.
          </Typography>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} flexWrap="wrap" useFlexGap>
          <Chip label={`${summary.total} recipient(s)`} sx={{ fontWeight: 700 }} />
          <Chip
            label={summary.latestDueAt ? `Next due ${formatNotificationDate(summary.latestDueAt)}` : 'No due item in preview'}
            sx={{ fontWeight: 700 }}
          />
          {channelEntries.map(([channel, count]) => (
            <Chip
              key={channel}
              label={`${getDeliveryChannelLabel(channel)} · ${count}`}
              sx={{ fontWeight: 700 }}
            />
          ))}
        </Stack>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Recipient</TableCell>
                <TableCell>Reminder</TableCell>
                <TableCell>Due</TableCell>
                <TableCell>Source</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`${row.recipient_user_id}-${row.source_record_id || 'none'}-${row.reminder_type}-${row.due_at || 'na'}`} hover>
                  <TableCell sx={{ minWidth: 220 }}>
                    <Typography fontWeight={700}>
                      {row.recipient_name || row.recipient_email || 'Member'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {row.recipient_email || 'No email on file'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ minWidth: 320 }}>
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip label={getReminderTypeLabel(row.reminder_type)} size="small" sx={{ fontWeight: 700 }} />
                        <Chip label={getDeliveryChannelLabel(row.delivery_channel)} size="small" sx={{ fontWeight: 700 }} />
                      </Stack>
                      <Box>
                        <Typography fontWeight={700}>{row.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {row.message}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ minWidth: 180 }}>{formatNotificationDate(row.due_at)}</TableCell>
                  <TableCell sx={{ minWidth: 220 }}>
                    <Typography fontWeight={700}>{row.source_label || 'Rule preview'}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {row.source_record_id || 'No linked record'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}

              {!rows.length ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Typography color="text.secondary" py={2}>
                      {loading ? 'Building preview…' : 'No recipients match the current reminder rule right now.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
    </Paper>
  );
};

export default ReminderPreviewTable;
