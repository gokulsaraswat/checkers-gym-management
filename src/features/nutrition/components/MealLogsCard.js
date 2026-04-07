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
  RestaurantMenu,
  WaterDrop,
} from '@mui/icons-material';

import {
  formatNutritionDate,
  getMealSlotLabel,
  MEAL_SLOT_OPTIONS,
  SCORE_OPTIONS,
} from '../nutritionHelpers';

const formatMetric = (value, suffix = '') => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  return `${value}${suffix}`;
};

const MealLogsCard = ({
  title = 'Meal logs',
  subtitle = 'Log meals, hydration, and adherence against your current plan.',
  logs = [],
  form,
  feedback,
  saving = false,
  disableActions = false,
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
          Nutrition logging
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
              <MenuItem value="">Unlinked / general log</MenuItem>
              {assignmentOptions.map((assignment) => (
                <MenuItem key={assignment.id} value={assignment.id}>
                  {assignment.template?.name || 'Nutrition plan'} • {assignment.member?.full_name || assignment.member?.email || 'Member'}
                </MenuItem>
              ))}
            </TextField>
          ) : null}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={showAssignmentSelector ? 4 : 6}>
              <TextField
                label="Logged on"
                type="date"
                value={form.logged_on}
                onChange={onFieldChange('logged_on')}
                InputLabelProps={{ shrink: true }}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6} md={showAssignmentSelector ? 4 : 6}>
              <TextField
                select
                label="Meal slot"
                value={form.meal_slot}
                onChange={onFieldChange('meal_slot')}
                fullWidth
              >
                {MEAL_SLOT_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={showAssignmentSelector ? 4 : 12}>
              <TextField
                label="Meal title"
                value={form.meal_title}
                onChange={onFieldChange('meal_title')}
                fullWidth
                placeholder="Chicken rice bowl, protein oats, smoothie..."
              />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={6} md={4} lg={2}>
              <TextField
                label="Calories"
                type="number"
                value={form.calories}
                onChange={onFieldChange('calories')}
                fullWidth
              />
            </Grid>
            <Grid item xs={6} md={4} lg={2}>
              <TextField
                label="Protein (g)"
                type="number"
                value={form.protein_g}
                onChange={onFieldChange('protein_g')}
                fullWidth
              />
            </Grid>
            <Grid item xs={6} md={4} lg={2}>
              <TextField
                label="Carbs (g)"
                type="number"
                value={form.carbs_g}
                onChange={onFieldChange('carbs_g')}
                fullWidth
              />
            </Grid>
            <Grid item xs={6} md={4} lg={2}>
              <TextField
                label="Fat (g)"
                type="number"
                value={form.fat_g}
                onChange={onFieldChange('fat_g')}
                fullWidth
              />
            </Grid>
            <Grid item xs={6} md={4} lg={2}>
              <TextField
                label="Water (L)"
                type="number"
                inputProps={{ step: '0.1' }}
                value={form.water_liters}
                onChange={onFieldChange('water_liters')}
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
                  <MenuItem key={`adherence-${option.value}`} value={option.value}>{option.label}</MenuItem>
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
                  <MenuItem key={`hunger-${option.value}`} value={option.value}>{option.label}</MenuItem>
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
                  <MenuItem key={`energy-${option.value}`} value={option.value}>{option.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          <TextField
            label="Notes"
            value={form.notes}
            onChange={onFieldChange('notes')}
            fullWidth
            multiline
            minRows={3}
            placeholder="How the meal felt, substitutions, appetite, digestion, prep notes..."
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
                if (form.id) return 'Update meal log';
                return 'Save meal log';
              })()}
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Divider />

      {!logs.length ? (
        <Alert severity="info" sx={{ borderRadius: 3 }}>
          No meal logs yet. Start logging meals to build your nutrition timeline.
        </Alert>
      ) : (
        <Stack spacing={1.75}>
          {logs.map((log) => (
            <Paper key={log.id} variant="outlined" sx={{ p: 2.25, borderRadius: 3, boxShadow: 'none' }}>
              <Stack spacing={1.5}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
                  <Stack spacing={0.4}>
                    <Typography variant="h6" fontWeight={800}>
                      {log.meal_title || getMealSlotLabel(log.meal_slot)}
                    </Typography>
                    <Typography color="text.secondary">
                      {formatNutritionDate(log.logged_on)} • {getMealSlotLabel(log.meal_slot)}
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                    <IconButton onClick={() => onEdit(log)} disabled={disableActions}>
                      <EditOutlined />
                    </IconButton>
                    <IconButton onClick={() => onDelete(log.id)} disabled={disableActions} color="error">
                      <DeleteOutline />
                    </IconButton>
                  </Stack>
                </Stack>

                <Grid container spacing={1.5}>
                  <Grid item xs={6} md={4} lg={2}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <RestaurantMenu sx={{ color: '#ff2625', fontSize: 20 }} />
                      <Typography variant="body2">{formatMetric(log.calories, ' kcal')}</Typography>
                    </Stack>
                  </Grid>
                  <Grid item xs={6} md={4} lg={2}>
                    <Typography variant="body2">Protein: {formatMetric(log.protein_g, 'g')}</Typography>
                  </Grid>
                  <Grid item xs={6} md={4} lg={2}>
                    <Typography variant="body2">Carbs: {formatMetric(log.carbs_g, 'g')}</Typography>
                  </Grid>
                  <Grid item xs={6} md={4} lg={2}>
                    <Typography variant="body2">Fat: {formatMetric(log.fat_g, 'g')}</Typography>
                  </Grid>
                  <Grid item xs={6} md={4} lg={2}>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <WaterDrop sx={{ color: '#2563eb', fontSize: 18 }} />
                      <Typography variant="body2">{formatMetric(log.water_liters, 'L')}</Typography>
                    </Stack>
                  </Grid>
                </Grid>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} useFlexGap flexWrap="wrap">
                  <Typography variant="body2" color="text.secondary">
                    Adherence: {formatMetric(log.adherence_score, '/5')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Hunger: {formatMetric(log.hunger_score, '/5')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Energy: {formatMetric(log.energy_score, '/5')}
                  </Typography>
                </Stack>

                {log.notes ? (
                  <Typography variant="body2" color="text.secondary">
                    {log.notes}
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

export default MealLogsCard;
