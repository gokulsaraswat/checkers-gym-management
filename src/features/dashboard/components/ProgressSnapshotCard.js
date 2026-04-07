import React from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  DeleteOutline,
  FavoriteBorder,
  MonitorWeight,
  Timeline,
} from '@mui/icons-material';

import {
  formatDashboardDate,
  formatNumericChange,
} from '../dashboardHelpers';

const MetricPill = ({ icon: Icon, label, value, helper }) => (
  <Paper
    variant="outlined"
    sx={{
      p: 2,
      borderRadius: 3,
      borderColor: '#e5e7eb',
      height: '100%',
    }}
  >
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} alignItems="center">
        {Icon ? <Icon sx={{ color: '#ff2625', fontSize: 20 }} /> : null}
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Stack>
      <Typography variant="h6" fontWeight={800}>
        {value}
      </Typography>
      {helper ? (
        <Typography variant="body2" color="text.secondary">
          {helper}
        </Typography>
      ) : null}
    </Stack>
  </Paper>
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
}) => {
  const latest = summary?.latest;

  return (
    <Paper
      id="progress-snapshot"
      className="surface-card"
      sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}
    >
      <Stack spacing={3}>
        <Box>
          <Typography color="#ff2625" fontWeight={700}>
            Progress snapshot
          </Typography>
          <Typography variant="h5" fontWeight={800} mt={0.5}>
            Body metrics and quick check-ins
          </Typography>
        </Box>

        {feedback?.message ? (
          <Alert severity={feedback.type || 'info'} sx={{ borderRadius: 3 }}>
            {feedback.message}
          </Alert>
        ) : null}

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <MetricPill
              icon={MonitorWeight}
              label="Latest weight"
              value={latest?.weight_kg ? `${latest.weight_kg} kg` : '—'}
              helper={summary?.weightDelta !== null ? `${formatNumericChange(summary.weightDelta, ' kg')} vs previous` : 'Add two entries to compare'}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <MetricPill
              icon={FavoriteBorder}
              label="Body fat"
              value={latest?.body_fat_percent ? `${latest.body_fat_percent}%` : '—'}
              helper={summary?.bodyFatDelta !== null ? `${formatNumericChange(summary.bodyFatDelta, '%')} vs previous` : 'Optional metric'}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <MetricPill
              icon={Timeline}
              label="Muscle % / heart rate"
              value={(() => {
                if (latest?.skeletal_muscle_percent) {
                  return `${latest.skeletal_muscle_percent}%`;
                }

                if (latest?.resting_heart_rate) {
                  return `${latest.resting_heart_rate} bpm`;
                }

                return '—';
              })()}
              helper={latest?.recorded_on ? `Recorded ${formatDashboardDate(latest.recorded_on)}` : 'No snapshot yet'}
            />
          </Grid>
        </Grid>

        <Divider />

        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2.5}>
            <Typography variant="h6" fontWeight={800}>
              Log a new snapshot
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="Recorded on"
                  type="date"
                  value={form.recorded_on}
                  onChange={onFieldChange('recorded_on')}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="Weight (kg)"
                  type="number"
                  inputProps={{ step: '0.1', min: '0' }}
                  value={form.weight_kg}
                  onChange={onFieldChange('weight_kg')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="Body fat %"
                  type="number"
                  inputProps={{ step: '0.1', min: '0' }}
                  value={form.body_fat_percent}
                  onChange={onFieldChange('body_fat_percent')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="Muscle %"
                  type="number"
                  inputProps={{ step: '0.1', min: '0' }}
                  value={form.skeletal_muscle_percent}
                  onChange={onFieldChange('skeletal_muscle_percent')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  label="Resting heart rate"
                  type="number"
                  inputProps={{ step: '1', min: '0' }}
                  value={form.resting_heart_rate}
                  onChange={onFieldChange('resting_heart_rate')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={8}>
                <TextField
                  label="Notes"
                  value={form.notes}
                  onChange={onFieldChange('notes')}
                  fullWidth
                  multiline
                  minRows={2}
                />
              </Grid>
            </Grid>

            <Button
              type="submit"
              variant="contained"
              disabled={saving || disableActions}
              sx={{
                bgcolor: '#ff2625',
                textTransform: 'none',
                borderRadius: 999,
                alignSelf: 'flex-start',
                px: 3,
                '&:hover': { bgcolor: '#df1d1d' },
              }}
            >
              {saving ? 'Saving...' : 'Save snapshot'}
            </Button>
          </Stack>
        </Box>

        <Divider />

        <Stack spacing={1.5}>
          <Typography variant="h6" fontWeight={800}>
            Recent snapshots
          </Typography>

          {!checkpoints.length ? (
            <Typography color="text.secondary">
              No progress entries yet. Add your first snapshot above.
            </Typography>
          ) : (
            checkpoints.slice(0, 4).map((checkpoint) => (
              <Paper
                key={checkpoint.id}
                variant="outlined"
                sx={{ p: 2, borderRadius: 3, borderColor: '#e5e7eb' }}
              >
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between">
                  <Stack spacing={0.75}>
                    <Typography fontWeight={700}>
                      {formatDashboardDate(checkpoint.recorded_on)}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {checkpoint.weight_kg ? <Typography variant="body2">Weight: {checkpoint.weight_kg} kg</Typography> : null}
                      {checkpoint.body_fat_percent ? <Typography variant="body2">Body fat: {checkpoint.body_fat_percent}%</Typography> : null}
                      {checkpoint.skeletal_muscle_percent ? <Typography variant="body2">Muscle: {checkpoint.skeletal_muscle_percent}%</Typography> : null}
                      {checkpoint.resting_heart_rate ? <Typography variant="body2">RHR: {checkpoint.resting_heart_rate} bpm</Typography> : null}
                    </Stack>
                    {checkpoint.notes ? (
                      <Typography variant="body2" color="text.secondary">
                        {checkpoint.notes}
                      </Typography>
                    ) : null}
                  </Stack>

                  <IconButton
                    aria-label="delete progress snapshot"
                    onClick={() => onDelete(checkpoint.id)}
                    disabled={disableActions}
                  >
                    <DeleteOutline />
                  </IconButton>
                </Stack>
              </Paper>
            ))
          )}
        </Stack>
      </Stack>
    </Paper>
  );
};

export default ProgressSnapshotCard;
