/* eslint-disable react/react-in-jsx-scope, import/no-extraneous-dependencies */

import PropTypes from 'prop-types';
import {
  Box,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

import { formatDateTime, formatDuration } from '../opsHelpers';
import SectionCard from './SectionCard';
import StatusChip from './StatusChip';

export default function OpsHealthPanel({ healthChecks, jobRuns }) {
  return (
    <SectionCard
      title="Health checks and job history"
      subtitle="Keep a fast read on system health state and recent job execution results from the admin operations surface."
    >
      <Box>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.25 }}>
          System health checks
        </Typography>
        <Stack spacing={1.25}>
          {healthChecks.length ? healthChecks.map((check) => (
            <Stack
              key={check.id || check.check_key}
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              spacing={1.5}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3,
                p: 1.5,
              }}
            >
              <Box>
                <Typography fontWeight={700}>{check.check_name || check.check_key}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Checked {formatDateTime(check.last_checked_at)}
                  {check.response_time_ms ? ` • ${check.response_time_ms} ms` : ''}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <StatusChip status={check.severity} />
                <StatusChip status={check.status} />
              </Stack>
            </Stack>
          )) : (
            <Typography variant="body2" color="text.secondary">
              No health checks recorded yet. Use the seed action or a platform worker to start recording checks.
            </Typography>
          )}
        </Stack>
      </Box>

      <Box>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.25 }}>
          Recent scheduled job runs
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Job</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Started</TableCell>
              <TableCell>Duration</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {jobRuns.length ? jobRuns.map((run) => (
              <TableRow key={run.id}>
                <TableCell>
                  <Stack spacing={0.35}>
                    <Typography variant="body2" fontWeight={700}>
                      {run.job_name || run.job_key}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {run.function_name || 'manual'}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <StatusChip status={run.run_status} />
                </TableCell>
                <TableCell>{formatDateTime(run.started_at)}</TableCell>
                <TableCell>{formatDuration(run.duration_ms)}</TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography variant="body2" color="text.secondary">
                    No scheduled job runs yet. This section will populate after workers or manual admin tools write run results.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
    </SectionCard>
  );
}

OpsHealthPanel.propTypes = {
  healthChecks: PropTypes.arrayOf(PropTypes.shape({
    check_key: PropTypes.string,
    check_name: PropTypes.string,
    id: PropTypes.string,
    last_checked_at: PropTypes.string,
    response_time_ms: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    severity: PropTypes.string,
    status: PropTypes.string,
  })),
  jobRuns: PropTypes.arrayOf(PropTypes.shape({
    duration_ms: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    function_name: PropTypes.string,
    id: PropTypes.string.isRequired,
    job_key: PropTypes.string,
    job_name: PropTypes.string,
    run_status: PropTypes.string,
    started_at: PropTypes.string,
  })),
};

OpsHealthPanel.defaultProps = {
  healthChecks: [],
  jobRuns: [],
};
