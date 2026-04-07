import React from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  Grid,
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
  MonitorHeart,
} from '@mui/icons-material';

import {
  formatNutritionDate,
  SCORE_OPTIONS,
} from '../nutritionHelpers';

const formatValue = (value, suffix = '') => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  return `${value}${suffix}`;
};

const NutritionCheckinsCard = ({
  title = 'Nutrition check-ins',
  subtitle = 'Capture adherence, body weight, recovery, and coaching notes.',
  entries = [],
  form,
  feedback,
  saving = false,
  disableActions = false,
  allowCoachFeedback = false,
  assignmentOptions = [],
  showAssignmentSelector = false,
  onFieldChange,
  onSubmit,
  onCancelEdit,
  onEdit,
  onDelete,
}) => (
  <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
    <Stack spacing={3}>
      <Box>
        <Typography color="#ff2625" fontWeight={700}>
          Coaching check-ins
        </Typography>
        <Typography variant="h5" fontWeight={800} mt={0.5}>
          {title}
        </Typography>
        <Typography color="text.secondary" mt={0.75}>
          {subtitle}
        </Typography>
      </Box>

      {feedback?.message ? (
        <Alert severity={feedback.type || 'info'} sx={{ borderRadius: 3 }}>
          {feedback.message}
        </Alert>
      ) : null}

      <Box component="form" onSubmit={onSubmit}>
        <Stack spacing={2.5}>
          {showAssignmentSelector ? (
            <TextField
              select
              label="Nutrition assignment"
              value={form.assignment_id}
              onChange={onFieldChange('assignment_id')}
              fullWidth
            >
              <MenuItem value="">Unlinked / general check-in</MenuItem>
              {assignmentOptions.map((assignment) => (
                <MenuItem key={assignment.id} value={assignment.id}>
                  {assignment.template?.name || 'Nutrition plan'} • {assignment.member?.full_name || assignment.member?.email || 'Member'}
                </MenuItem>
              ))}
            </TextField>
          ) : null}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Check-in date"
                type="date"
                value={form.checked_in_on}
                onChange={onFieldChange('checked_in_on')}
                InputLabelProps={{ shrink: true }}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Body weight (kg)"
                type="number"
                value={form.body_weight}
                onChange={onFieldChange('body_weight')}
                fullWidth
              />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                label="Adherence"
                value={form.adherence_score}
                onChange={onFieldChange('adherence_score')}
                fullWidth
              >
                <MenuItem value="">Not rated</MenuItem>
                {SCORE_OPTIONS.map((option) => (
                  <MenuItem key={`adherence-checkin-${option.value}`} value={option.value}>{option.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                label="Hunger"
                value={form.hunger_score}
                onChange={onFieldChange('hunger_score')}
                fullWidth
              >
                <MenuItem value="">Not rated</MenuItem>
                {SCORE_OPTIONS.map((option) => (
                  <MenuItem key={`hunger-checkin-${option.value}`} value={option.value}>{option.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                label="Energy"
                value={form.energy_score}
                onChange={onFieldChange('energy_score')}
                fullWidth
              >
                <MenuItem value="">Not rated</MenuItem>
                {SCORE_OPTIONS.map((option) => (
                  <MenuItem key={`energy-checkin-${option.value}`} value={option.value}>{option.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          <TextField
            label="Digestion / recovery notes"
            value={form.digestion_notes}
            onChange={onFieldChange('digestion_notes')}
            fullWidth
            multiline
            minRows={2}
          />

          <Grid container spacing={2}>
            <Grid item xs={12} md={allowCoachFeedback ? 6 : 12}>
              <TextField
                label="Next focus"
                value={form.next_focus}
                onChange={onFieldChange('next_focus')}
                fullWidth
                multiline
                minRows={2}
              />
            </Grid>
            {allowCoachFeedback ? (
              <Grid item xs={12} md={6}>
                <TextField
                  label="Coach feedback"
                  value={form.coach_feedback}
                  onChange={onFieldChange('coach_feedback')}
                  fullWidth
                  multiline
                  minRows={2}
                />
              </Grid>
            ) : null}
          </Grid>

          <TextField
            label="Additional notes"
            value={form.notes}
            onChange={onFieldChange('notes')}
            fullWidth
            multiline
            minRows={3}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="flex-end">
            {form.id ? (
              <Button
                variant="text"
                onClick={onCancelEdit}
                disabled={saving}
                sx={{ textTransform: 'none', borderRadius: 999 }}
              >
                Cancel edit
              </Button>
            ) : null}

            <Button
              type="submit"
              variant="contained"
              disabled={disableActions || saving}
              sx={{
                bgcolor: '#ff2625',
                textTransform: 'none',
                borderRadius: 999,
                '&:hover': { bgcolor: '#df1d1d' },
              }}
            >
              {(() => {
                if (saving) return 'Saving...';
                if (form.id) return 'Update check-in';
                return 'Save check-in';
              })()}
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Divider />

      {!entries.length ? (
        <Alert severity="info" sx={{ borderRadius: 3 }}>
          No nutrition check-ins yet. Use this space for weekly reflections and coach notes.
        </Alert>
      ) : (
        <Stack spacing={1.75}>
          {entries.map((entry) => (
            <Paper key={entry.id} variant="outlined" sx={{ p: 2.25, borderRadius: 3, boxShadow: 'none' }}>
              <Stack spacing={1.5}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
                  <Stack spacing={0.4}>
                    <Typography variant="h6" fontWeight={800}>
                      {formatNutritionDate(entry.checked_in_on)}
                    </Typography>
                    <Typography color="text.secondary">
                      Weekly nutrition review
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                    <IconButton onClick={() => onEdit(entry)} disabled={disableActions}>
                      <EditOutlined />
                    </IconButton>
                    <IconButton onClick={() => onDelete(entry.id)} disabled={disableActions} color="error">
                      <DeleteOutline />
                    </IconButton>
                  </Stack>
                </Stack>

                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <MonitorHeart sx={{ color: '#ff2625', fontSize: 20 }} />
                      <Typography variant="body2">
                        Weight: {formatValue(entry.body_weight, ' kg')}
                      </Typography>
                    </Stack>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="body2">Adherence: {formatValue(entry.adherence_score, '/5')}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="body2">Hunger: {formatValue(entry.hunger_score, '/5')}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="body2">Energy: {formatValue(entry.energy_score, '/5')}</Typography>
                  </Grid>
                </Grid>

                {entry.digestion_notes ? (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Digestion / recovery:</strong> {entry.digestion_notes}
                  </Typography>
                ) : null}

                {entry.next_focus ? (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Next focus:</strong> {entry.next_focus}
                  </Typography>
                ) : null}

                {entry.coach_feedback ? (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Coach feedback:</strong> {entry.coach_feedback}
                  </Typography>
                ) : null}

                {entry.notes ? (
                  <Typography variant="body2" color="text.secondary">
                    {entry.notes}
                  </Typography>
                ) : null}
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  </Paper>
);

export default NutritionCheckinsCard;
