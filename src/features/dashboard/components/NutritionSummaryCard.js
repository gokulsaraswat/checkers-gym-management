import React from 'react';
import { Button, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import { RestaurantMenu, WaterDrop } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

import { PATHS } from '../../../app/paths';
import {
  formatAssignmentDateRange,
  formatMacroTargets,
  formatNutritionDate,
  getNutritionAssignmentStatusChipSx,
  getNutritionAssignmentStatusMeta,
} from '../../nutrition/nutritionHelpers';

const formatAverage = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }

  return `${Number(value).toFixed(1)}/5`;
};

const NutritionSummaryCard = ({ summary }) => {
  const assignment = summary?.assignment;
  const template = assignment?.template;
  const statusMeta = getNutritionAssignmentStatusMeta(assignment?.assignment_status);

  return (
    <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
      <Stack spacing={2.5}>
        <Stack spacing={0.5}>
          <Typography color="#ff2625" fontWeight={700}>
            Nutrition plan
          </Typography>
          <Typography variant="h5" fontWeight={800}>
            {template?.name || 'No nutrition plan yet'}
          </Typography>
          <Typography color="text.secondary">
            {template?.goal || assignment?.goal_note || 'Meal plans, macros, and check-ins will appear here once a coach assigns one.'}
          </Typography>
        </Stack>

        {assignment ? (
          <>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                label={statusMeta.label}
                sx={getNutritionAssignmentStatusChipSx(assignment.assignment_status)}
              />
              <Chip label={`${summary?.activeDayCount || 0} day blocks`} />
              <Chip label={`${summary?.logsTodayCount || 0} meals today`} />
            </Stack>

            <Divider />

            <Stack spacing={1.2}>
              <Typography variant="body1">
                <strong>Schedule:</strong> {formatAssignmentDateRange(assignment.start_date, assignment.end_date)}
              </Typography>
              <Typography variant="body1">
                <strong>Targets:</strong> {formatMacroTargets(summary?.targets)}
              </Typography>
              <Typography variant="body1">
                <strong>This week:</strong> {summary?.logsThisWeekCount || 0} meal logs
              </Typography>
              <Typography variant="body1">
                <strong>Average adherence:</strong> {formatAverage(summary?.averageAdherence)}
              </Typography>
              <Typography variant="body1">
                <strong>Last check-in:</strong> {summary?.lastCheckin ? formatNutritionDate(summary.lastCheckin.checked_in_on) : 'No check-in yet'}
              </Typography>
            </Stack>

            {summary?.macroTotals?.water_liters ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <WaterDrop sx={{ color: '#2563eb', fontSize: 20 }} />
                <Typography variant="body2" color="text.secondary">
                  Total logged water: {Number(summary.macroTotals.water_liters).toFixed(1)}L
                </Typography>
              </Stack>
            ) : null}
          </>
        ) : (
          <Stack spacing={1.25}>
            <Typography fontWeight={700}>
              Ask a coach to assign a plan
            </Typography>
            <Typography color="text.secondary" lineHeight={1.75}>
              Staff can build meal templates, assign calorie and macro targets, and review your weekly nutrition check-ins.
            </Typography>
          </Stack>
        )}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button
            component={RouterLink}
            to={PATHS.nutrition}
            variant="contained"
            startIcon={<RestaurantMenu />}
            sx={{
              bgcolor: '#ff2625',
              textTransform: 'none',
              borderRadius: 999,
              '&:hover': { bgcolor: '#df1d1d' },
            }}
          >
            Open nutrition
          </Button>
          <Button
            component={RouterLink}
            to={PATHS.workoutPlan}
            variant="outlined"
            sx={{ textTransform: 'none', borderRadius: 999 }}
          >
            Workout plan
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
};

export default NutritionSummaryCard;
