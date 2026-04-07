import React from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

import { PATHS } from '../../../app/paths';
import { formatDashboardDate } from '../dashboardHelpers';

const WorkoutPlanSummaryCard = ({ summary, profile }) => (
  <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
    <Stack spacing={2}>
      <Box>
        <Typography color="#ff2625" fontWeight={700}>
          Workout plan summary
        </Typography>
        <Typography variant="h6" fontWeight={800} mt={0.5}>
          Stay on top of planned sessions
        </Typography>
      </Box>

      <Typography color="text.secondary" lineHeight={1.8}>
        Your dashboard combines planned workout rows, recent completions, and recurring exercise focus areas so you
        can see whether training is moving forward without opening each log one by one.
      </Typography>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip label={`${summary?.plannedWorkouts || 0} planned`} />
        <Chip label={`${summary?.completedWorkouts || 0} completed`} />
        <Chip label={`${summary?.distinctExercises || 0} unique exercises`} />
      </Stack>

      <Divider />

      <Stack spacing={1.2}>
        <Typography variant="body1">
          <strong>Next planned workout:</strong>{' '}
          {summary?.nextPlannedWorkout
            ? `${summary.nextPlannedWorkout.title} • ${formatDashboardDate(summary.nextPlannedWorkout.workout_date)}`
            : 'No planned workout yet'}
        </Typography>
        <Typography variant="body1">
          <strong>Latest completed session:</strong>{' '}
          {summary?.lastCompletedWorkout
            ? `${summary.lastCompletedWorkout.title} • ${formatDashboardDate(summary.lastCompletedWorkout.workout_date)}`
            : 'No completed session yet'}
        </Typography>
      </Stack>

      {summary?.focusExercises?.length ? (
        <>
          <Divider />
          <Stack spacing={1}>
            <Typography fontWeight={700}>
              Current focus exercises
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {summary.focusExercises.map((exercise) => (
                <Chip key={exercise} label={exercise} sx={{ bgcolor: '#fff0f0', color: '#ff2625', fontWeight: 700 }} />
              ))}
            </Stack>
          </Stack>
        </>
      ) : null}

      {summary?.upcomingWorkouts?.length ? (
        <>
          <Divider />
          <Stack spacing={1}>
            <Typography fontWeight={700}>
              Upcoming planned sessions
            </Typography>
            {summary.upcomingWorkouts.map((workout) => (
              <Typography key={workout.id || `${workout.title}-${workout.workout_date}`} variant="body2" color="text.secondary">
                {workout.title} • {formatDashboardDate(workout.workout_date)}
              </Typography>
            ))}
          </Stack>
        </>
      ) : null}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} pt={0.5}>
        <Button
          component={RouterLink}
          to={`${PATHS.dashboard}#workout-tracker`}
          variant="contained"
          sx={{
            bgcolor: '#ff2625',
            textTransform: 'none',
            borderRadius: 999,
            '&:hover': { bgcolor: '#df1d1d' },
          }}
        >
          Open workout tracker
        </Button>

        {profile?.role === 'admin' ? (
          <Button
            component={RouterLink}
            to={PATHS.admin}
            variant="outlined"
            sx={{ textTransform: 'none', borderRadius: 999 }}
          >
            Open admin panel
          </Button>
        ) : null}
      </Stack>
    </Stack>
  </Paper>
);

export default WorkoutPlanSummaryCard;
