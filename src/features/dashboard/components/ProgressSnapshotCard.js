import React from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  DeleteOutline,
  MonitorWeight,
  MonitorHeartOutlined,
  TrendingUp,
} from '@mui/icons-material';

import { formatDashboardDate } from '../dashboardHelpers';

const metricLabel = (value, suffix, fallback = '—') => (
  value !== null && value !== undefined && value !== '' ? `${value}${suffix}` : fallback
);

const ProgressSnapshotCard = ({
  summary,
  checkpoints = [],
  form,
  feedback,
  saving,
  onFieldChange,
  onSubmit,
  onDelete,
  disableActions = false,
}) => (
  <Paper
    id="progress-snapshots"
    className="surface-card"
    sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}
  >
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography color="#ff2625" fontWeight={700}>
          Progress snapshots
        </Typography>
        <Typography variant="h5" fontWeight={800}>
          Track body metrics over time
        </Typography>
        <Typography color="text.secondary">
          Capture regular measurements so you and your trainer can compare trends week over week.
        </Typography>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
        <Paper variant="outlined" sx={{ flex: 1, p: 2, borderRadius: 3, boxShadow: 'none' }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <MonitorWeight sx={{ color: '#ff2625' }} />
            <Box>
              <Typography fontWeight={800}>
                {metricLabel(summary?.latest?.weight_kg, ' kg')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Latest weight
              </Typography>
            </Box>
          </Stack>
        </Paper>
        <Paper variant="outlined" sx={{ flex: 1, p: 2, borderRadius: 3, boxShadow: 'none' }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <TrendingUp sx={{ color: '#ff2625' }} />
            <Box>
              <Typography fontWeight={800}>
                {summary?.weightDelta === null || summary?.weightDelta === undefined
                  ? '—'
                  : `${summary.weightDelta > 0 ? '+' : ''}${summary.weightDelta.toFixed(1)} kg`}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Weight change vs previous
              </Typography>
            </Box>
          </Stack>
        </Paper>
        <Paper variant="outlined" sx={{ flex: 1, p: 2, borderRadius: 3, boxShadow: 'none' }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <MonitorHeartOutlined sx={{ color: '#ff2625' }} />
            <Box>
              <Typography fontWeight={800}>
                {metricLabel(summary?.latest?.resting_heart_rate, ' bpm')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Resting heart rate
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Stack>

      {feedback?.message ? (
        <Alert severity={feedback.type || 'info'} sx={{ borderRadius: 3 }}>
          {feedback.message}
        </Alert>
      ) : null}

      <Box component="form" onSubmit={onSubmit}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label="Recorded on"
              type="date"
              value={form.recorded_on}
              onChange={onFieldChange('recorded_on')}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Weight (kg)"
              type="number"
              inputProps={{ step: '0.1' }}
              value={form.weight_kg}
              onChange={onFieldChange('weight_kg')}
              fullWidth
            />
            <TextField
              label="Body fat %"
              type="number"
              inputProps={{ step: '0.1' }}
              value={form.body_fat_percent}
              onChange={onFieldChange('body_fat_percent')}
              fullWidth
            />
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label="Skeletal muscle %"
              type="number"
              inputProps={{ step: '0.1' }}
              value={form.skeletal_muscle_percent}
              onChange={onFieldChange('skeletal_muscle_percent')}
              fullWidth
            />
            <TextField
              label="Resting heart rate"
              type="number"
              inputProps={{ step: '1' }}
              value={form.resting_heart_rate}
              onChange={onFieldChange('resting_heart_rate')}
              fullWidth
            />
          </Stack>

          <TextField
            label="Notes"
            value={form.notes}
            onChange={onFieldChange('notes')}
            fullWidth
            multiline
            minRows={3}
            placeholder="Recovery notes, sleep quality, soreness, performance observations..."
          />

          <Button
            type="submit"
            variant="contained"
            disabled={saving || disableActions}
            sx={{ alignSelf: 'flex-start', bgcolor: '#ff2625', borderRadius: 999, textTransform: 'none', '&:hover': { bgcolor: '#df1d1d' } }}
          >
            {saving ? 'Saving snapshot...' : 'Save progress snapshot'}
          </Button>
        </Stack>
      </Box>

      <Divider />

      <Stack spacing={1.5}>
        <Typography variant="h6" fontWeight={800}>
          Recent entries
        </Typography>

        {!checkpoints.length ? (
          <Typography color="text.secondary">
            No progress snapshots yet. Add your first check-in above.
          </Typography>
        ) : (
          checkpoints.slice(0, 6).map((checkpoint) => (
            <Paper key={checkpoint.id} variant="outlined" sx={{ p: 2, borderRadius: 3, boxShadow: 'none' }}>
              <Stack spacing={1.25}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                  <Box>
                    <Typography fontWeight={800}>
                      {formatDashboardDate(checkpoint.recorded_on)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {[
                        metricLabel(checkpoint.weight_kg, ' kg'),
                        metricLabel(checkpoint.body_fat_percent, '%'),
                        metricLabel(checkpoint.skeletal_muscle_percent, '%'),
                      ].filter((value) => value !== '—').join(' • ') || 'No measurement values'}
                    </Typography>
                  </Box>

                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => onDelete(checkpoint.id)}
                    disabled={disableActions}
                  >
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </Stack>

                {checkpoint.notes ? (
                  <Typography color="text.secondary">
                    {checkpoint.notes}
                  </Typography>
                ) : null}
              </Stack>
            </Paper>
          ))
        )}
      </Stack>
    </Stack>
  </Paper>
);

export default ProgressSnapshotCard;
