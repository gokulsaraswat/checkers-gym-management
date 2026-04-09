import React from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material';

const decisionColorMap = {
  allow: 'success',
  deny: 'error',
};

export default function AccessLogsCard({
  title,
  logs = [],
  emptyMessage = 'No access activity to show yet.',
}) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          {title}
        </Typography>
        {!logs.length ? (
          <Alert severity="info">{emptyMessage}</Alert>
        ) : (
          <Stack spacing={2}>
            {logs.map((log, index) => (
              <Box key={log.id || `${log.created_at}-${index}`}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip label={(log.decision || 'unknown').toUpperCase()} color={decisionColorMap[log.decision] || 'default'} size="small" />
                    <Chip label={(log.entry_method || 'unknown').replace('_', ' ')} variant="outlined" size="small" />
                    {log.waiver_status ? <Chip label={`Waiver: ${log.waiver_status}`} variant="outlined" size="small" /> : null}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                  </Typography>
                </Stack>
                <Typography variant="subtitle2" fontWeight={700} mt={1}>
                  {log.full_name || 'Unknown member'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {log.email || log.membership_status || 'No additional identity info.'}
                </Typography>
                <Typography variant="body2" mt={0.75}>
                  {log.plan_name ? `Plan: ${log.plan_name}` : 'Plan not attached'}
                  {log.access_point_name ? ` • Point: ${log.access_point_name}` : ''}
                  {log.branch_name ? ` • ${log.branch_name}` : ''}
                </Typography>
                {log.denial_reason ? (
                  <Alert severity="warning" sx={{ mt: 1.5 }}>
                    {log.denial_reason}
                  </Alert>
                ) : null}
                {index < logs.length - 1 ? <Divider sx={{ mt: 2 }} /> : null}
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
