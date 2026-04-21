/* eslint-disable react/react-in-jsx-scope, import/no-extraneous-dependencies, react/forbid-prop-types */

import PropTypes from 'prop-types';
import {
  Box,
  Button,
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

import { EXPORT_PRESETS, formatDateTime, formatJsonSummary } from '../opsHelpers';
import SectionCard from './SectionCard';
import StatusChip from './StatusChip';

export default function OpsExportQueuePanel({ jobs, onQueueExport, queueingKey }) {
  return (
    <SectionCard
      title="Export center"
      subtitle="Queue lightweight admin exports and track recent export jobs without leaving the operations workspace."
    >
      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
        }}
      >
        {EXPORT_PRESETS.map((preset) => {
          const isQueueing = queueingKey === preset.key;

          return (
            <Paper
              key={preset.key}
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 3,
                height: '100%',
              }}
            >
              <Stack spacing={1.5} sx={{ height: '100%' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                  <Box>
                    <Typography fontWeight={700}>{preset.label}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {preset.description}
                    </Typography>
                  </Box>
                  <Chip size="small" label={preset.fileFormat.toUpperCase()} variant="outlined" />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {formatJsonSummary(preset.filters)}
                </Typography>
                <Box sx={{ pt: 0.5 }}>
                  <Button
                    variant="contained"
                    onClick={() => onQueueExport(preset)}
                    disabled={isQueueing}
                    sx={{ textTransform: 'none', borderRadius: 999 }}
                  >
                    {isQueueing ? 'Queueing…' : 'Queue export'}
                  </Button>
                </Box>
              </Stack>
            </Paper>
          );
        })}
      </Box>

      <Box>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.25 }}>
          Recent export jobs
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Export</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Requested</TableCell>
              <TableCell>Details</TableCell>
              <TableCell align="right">File</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {jobs.length ? jobs.map((job) => {
              const fileUrl = job.file_url || null;

              return (
                <TableRow key={job.id}>
                  <TableCell>
                    <Stack spacing={0.4}>
                      <Typography variant="body2" fontWeight={700}>
                        {job.export_label || job.export_type}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(job.file_format || 'csv').toUpperCase()} • {job.export_type}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <StatusChip status={job.status} />
                  </TableCell>
                  <TableCell>{formatDateTime(job.requested_at || job.created_at)}</TableCell>
                  <TableCell>
                    <Stack spacing={0.35}>
                      <Typography variant="body2" color="text.secondary">
                        {formatJsonSummary(job.filters)}
                      </Typography>
                      {job.notes ? (
                        <Typography variant="caption" color="text.secondary">
                          {job.notes}
                        </Typography>
                      ) : null}
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    {fileUrl ? (
                      <Button
                        component="a"
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        size="small"
                        variant="outlined"
                        sx={{ textTransform: 'none', borderRadius: 999 }}
                      >
                        Open
                      </Button>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        Pending
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            }) : (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary">
                    No export jobs yet. Queue one of the preset exports above to start the operator workflow.
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

OpsExportQueuePanel.propTypes = {
  jobs: PropTypes.arrayOf(PropTypes.shape({
    created_at: PropTypes.string,
    export_label: PropTypes.string,
    export_type: PropTypes.string,
    file_format: PropTypes.string,
    file_url: PropTypes.string,
    filters: PropTypes.object,
    id: PropTypes.string.isRequired,
    notes: PropTypes.string,
    requested_at: PropTypes.string,
    status: PropTypes.string,
  })),
  onQueueExport: PropTypes.func.isRequired,
  queueingKey: PropTypes.string,
};

OpsExportQueuePanel.defaultProps = {
  jobs: [],
  queueingKey: '',
};
