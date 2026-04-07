import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  DeleteOutline,
  EditOutlined,
  FitnessCenter,
  PlaylistAddCheck,
  TrendingUp,
} from '@mui/icons-material';

import {
  PERSONAL_RECORD_TYPE_OPTIONS,
  formatMetric,
  formatProgressDate,
  getPersonalRecordTypeChipSx,
  getPersonalRecordTypeMeta,
} from '../progressHelpers';

const PersonalRecordsCard = ({
  sectionLabel = 'Personal records',
  heading = 'Track lifts, reps, and milestone performances',
  description = 'Save new bests across strength, conditioning, or custom events so progress feels tangible.',
  summary,
  records = [],
  form,
  feedback,
  saving,
  onFieldChange,
  onSubmit,
  onEdit = null,
  onDelete = null,
  onResetForm = null,
  disableActions = false,
  entryLimit = 8,
  emptyStateText = 'No personal records yet. Log your first achievement above.',
}) => (
  <Paper
    id="personal-records"
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
            <FitnessCenter sx={{ color: '#ff2625' }} />
            <Box>
              <Typography fontWeight={800}>
                {summary?.totalRecords ?? 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total records logged
              </Typography>
            </Box>
          </Stack>
        </Paper>
        <Paper variant="outlined" sx={{ flex: 1, p: 2, borderRadius: 3, boxShadow: 'none' }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <PlaylistAddCheck sx={{ color: '#ff2625' }} />
            <Box>
              <Typography fontWeight={800}>
                {summary?.monthlyRecords ?? 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Records this month
              </Typography>
            </Box>
          </Stack>
        </Paper>
        <Paper variant="outlined" sx={{ flex: 1, p: 2, borderRadius: 3, boxShadow: 'none' }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <TrendingUp sx={{ color: '#ff2625' }} />
            <Box>
              <Typography fontWeight={800}>
                {summary?.uniqueExercises ?? 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Unique movements tracked
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
              label="Exercise or event"
              value={form.exercise_name}
              onChange={onFieldChange('exercise_name')}
              fullWidth
            />
            <TextField
              select
              label="Record type"
              value={form.record_type}
              onChange={onFieldChange('record_type')}
              fullWidth
            >
              {PERSONAL_RECORD_TYPE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label="Value"
              type="number"
              inputProps={{ step: '0.1' }}
              value={form.record_value}
              onChange={onFieldChange('record_value')}
              fullWidth
            />
            <TextField
              label="Unit"
              value={form.unit}
              onChange={onFieldChange('unit')}
              fullWidth
            />
            <TextField
              label="Achieved on"
              type="date"
              value={form.achieved_on}
              onChange={onFieldChange('achieved_on')}
              InputLabelProps={{ shrink: true }}
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
            placeholder="Technique cues, event context, or how the PR felt..."
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
            <Button
              type="submit"
              variant="contained"
              disabled={saving || disableActions}
              sx={{ alignSelf: 'flex-start', bgcolor: '#ff2625', borderRadius: 999, textTransform: 'none', '&:hover': { bgcolor: '#df1d1d' } }}
            >
              {(() => {
                if (saving) return 'Saving record...';
                if (form.id) return 'Update personal record';
                return 'Save personal record';
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
          Recent achievements
        </Typography>

        {!records.length ? (
          <Typography color="text.secondary">
            {emptyStateText}
          </Typography>
        ) : (
          records.slice(0, entryLimit).map((record) => (
            <Paper key={record.id} variant="outlined" sx={{ p: 2, borderRadius: 3, boxShadow: 'none' }}>
              <Stack spacing={1.25}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                  <Box>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} mb={0.75}>
                      <Typography fontWeight={800}>
                        {record.exercise_name || 'Personal record'}
                      </Typography>
                      <Chip
                        label={getPersonalRecordTypeMeta(record.record_type).label}
                        size="small"
                        sx={getPersonalRecordTypeChipSx(record.record_type)}
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {`${formatMetric(record.record_value, record.unit ? ` ${record.unit}` : '')} • ${formatProgressDate(record.achieved_on)}`}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={0.5}>
                    {onEdit ? (
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => onEdit(record)}
                        disabled={disableActions}
                      >
                        <EditOutlined fontSize="small" />
                      </IconButton>
                    ) : null}
                    {onDelete ? (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => onDelete(record.id)}
                        disabled={disableActions}
                      >
                        <DeleteOutline fontSize="small" />
                      </IconButton>
                    ) : null}
                  </Stack>
                </Stack>

                {record.notes ? (
                  <Typography color="text.secondary">
                    {record.notes}
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

export default PersonalRecordsCard;
