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
  EditOutlined,
  FitnessCenter,
  MonitorWeight,
  TrendingUp,
} from '@mui/icons-material';

import {
  formatDeltaLabel,
  formatMetric,
  formatProgressDate,
} from '../progressHelpers';

const BodyMeasurementsCard = ({
  sectionLabel = 'Body measurements',
  heading = 'Log circumference and size changes',
  description = 'Track waist, chest, hips, arms, and legs so your progress reflects more than scale weight alone.',
  summary,
  measurements = [],
  form,
  feedback,
  saving,
  onFieldChange,
  onSubmit,
  onEdit = null,
  onDelete = null,
  onResetForm = null,
  disableActions = false,
  entryLimit = 6,
  emptyStateText = 'No body measurements yet. Add your first tape-measure check-in above.',
}) => (
  <Paper
    id="body-measurements"
    className="surface-card"
    sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}
  >
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography color="#ff2625" fontWeight={700}>
          {sectionLabel}
        </Typography>
        <Typography variant="h5" fontWeight={800}>
          {heading}
        </Typography>
        <Typography color="text.secondary">
          {description}
        </Typography>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
        <Paper variant="outlined" sx={{ flex: 1, p: 2, borderRadius: 3, boxShadow: 'none' }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <MonitorWeight sx={{ color: '#ff2625' }} />
            <Box>
              <Typography fontWeight={800}>
                {formatMetric(summary?.latest?.waist_cm, ' cm')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Latest waist
              </Typography>
            </Box>
          </Stack>
        </Paper>
        <Paper variant="outlined" sx={{ flex: 1, p: 2, borderRadius: 3, boxShadow: 'none' }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <FitnessCenter sx={{ color: '#ff2625' }} />
            <Box>
              <Typography fontWeight={800}>
                {formatMetric(summary?.latest?.chest_cm, ' cm')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Latest chest
              </Typography>
            </Box>
          </Stack>
        </Paper>
        <Paper variant="outlined" sx={{ flex: 1, p: 2, borderRadius: 3, boxShadow: 'none' }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <TrendingUp sx={{ color: '#ff2625' }} />
            <Box>
              <Typography fontWeight={800}>
                {formatDeltaLabel(summary?.waistDelta, ' cm')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Waist change vs previous
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
              label="Height (cm)"
              type="number"
              inputProps={{ step: '0.1' }}
              value={form.height_cm}
              onChange={onFieldChange('height_cm')}
              fullWidth
            />
            <TextField
              label="Chest (cm)"
              type="number"
              inputProps={{ step: '0.1' }}
              value={form.chest_cm}
              onChange={onFieldChange('chest_cm')}
              fullWidth
            />
            <TextField
              label="Waist (cm)"
              type="number"
              inputProps={{ step: '0.1' }}
              value={form.waist_cm}
              onChange={onFieldChange('waist_cm')}
              fullWidth
            />
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label="Hips (cm)"
              type="number"
              inputProps={{ step: '0.1' }}
              value={form.hips_cm}
              onChange={onFieldChange('hips_cm')}
              fullWidth
            />
            <TextField
              label="Left arm (cm)"
              type="number"
              inputProps={{ step: '0.1' }}
              value={form.left_arm_cm}
              onChange={onFieldChange('left_arm_cm')}
              fullWidth
            />
            <TextField
              label="Right arm (cm)"
              type="number"
              inputProps={{ step: '0.1' }}
              value={form.right_arm_cm}
              onChange={onFieldChange('right_arm_cm')}
              fullWidth
            />
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label="Left thigh (cm)"
              type="number"
              inputProps={{ step: '0.1' }}
              value={form.left_thigh_cm}
              onChange={onFieldChange('left_thigh_cm')}
              fullWidth
            />
            <TextField
              label="Right thigh (cm)"
              type="number"
              inputProps={{ step: '0.1' }}
              value={form.right_thigh_cm}
              onChange={onFieldChange('right_thigh_cm')}
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
            placeholder="Any posture cues, asymmetry notes, or measurement context..."
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
            <Button
              type="submit"
              variant="contained"
              disabled={saving || disableActions}
              sx={{ alignSelf: 'flex-start', bgcolor: '#ff2625', borderRadius: 999, textTransform: 'none', '&:hover': { bgcolor: '#df1d1d' } }}
            >
              {(() => {
                if (saving) return 'Saving measurement...';
                if (form.id) return 'Update measurement';
                return 'Save measurement';
              })()}
            </Button>
            {form.id && onResetForm ? (
              <Button
                variant="outlined"
                disabled={saving || disableActions}
                onClick={onResetForm}
                sx={{ borderRadius: 999, textTransform: 'none', alignSelf: 'flex-start' }}
              >
                Cancel edit
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </Box>

      <Divider />

      <Stack spacing={1.5}>
        <Typography variant="h6" fontWeight={800}>
          Recent measurement entries
        </Typography>

        {!measurements.length ? (
          <Typography color="text.secondary">
            {emptyStateText}
          </Typography>
        ) : (
          measurements.slice(0, entryLimit).map((measurement) => (
            <Paper key={measurement.id} variant="outlined" sx={{ p: 2, borderRadius: 3, boxShadow: 'none' }}>
              <Stack spacing={1.25}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                  <Box>
                    <Typography fontWeight={800}>
                      {formatProgressDate(measurement.recorded_on)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {[
                        measurement.waist_cm != null ? `Waist ${formatMetric(measurement.waist_cm, ' cm')}` : null,
                        measurement.chest_cm != null ? `Chest ${formatMetric(measurement.chest_cm, ' cm')}` : null,
                        measurement.hips_cm != null ? `Hips ${formatMetric(measurement.hips_cm, ' cm')}` : null,
                      ].filter(Boolean).join(' • ') || 'Measurements saved'}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={0.5}>
                    {onEdit ? (
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => onEdit(measurement)}
                        disabled={disableActions}
                      >
                        <EditOutlined fontSize="small" />
                      </IconButton>
                    ) : null}
                    {onDelete ? (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => onDelete(measurement.id)}
                        disabled={disableActions}
                      >
                        <DeleteOutline fontSize="small" />
                      </IconButton>
                    ) : null}
                  </Stack>
                </Stack>

                {measurement.notes ? (
                  <Typography color="text.secondary">
                    {measurement.notes}
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

export default BodyMeasurementsCard;
