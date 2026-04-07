import React from 'react';
import { Button, Chip, Paper, Stack, Typography } from '@mui/material';
import { CalendarMonth, FitnessCenter } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

import { PATHS } from '../../../app/paths';
import {
  formatProgramDateRange,
  getWorkoutAssignmentStatusChipSx,
  getWorkoutAssignmentStatusMeta,
  getWorkoutProgramStatusChipSx,
  getWorkoutProgramStatusMeta,
} from '../../workouts/workoutProgrammingHelpers';

const WorkoutPlanSummaryCard = ({ summary, profile }) => {
  const assignment = summary?.activeAssignment;
  const program = assignment?.program;

  return (
    <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
      <Stack spacing={2.5}>
        <Stack spacing={0.5}>
          <Typography color="#ff2625" fontWeight={700}>
            Workout plan
          </Typography>
          <Typography variant="h5" fontWeight={800}>
            {program?.name || 'No structured plan yet'}
          </Typography>
          <Typography color="text.secondary">
            {program?.goal || 'Trainer-assigned templates will appear here once staff start programming workouts.'}
          </Typography>
        </Stack>

        {assignment && program ? (
          <>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                label={getWorkoutProgramStatusMeta(program.status).label}
                sx={getWorkoutProgramStatusChipSx(program.status)}
              />
              <Chip
                label={getWorkoutAssignmentStatusMeta(assignment.assignment_status).label}
                sx={getWorkoutAssignmentStatusChipSx(assignment.assignment_status)}
              />
              <Chip label={`${program.sessions_per_week || summary?.activeDayCount || 0} sessions/week`} />
            </Stack>

            <Stack spacing={1.2}>
              <Typography variant="body2" color="text.secondary">
                {program.description || 'No additional program description was provided yet.'}
              </Typography>
              <Typography variant="body1">
                <strong>Schedule:</strong> {formatProgramDateRange(assignment.start_date, assignment.end_date)}
              </Typography>
              <Typography variant="body1">
                <strong>Template days:</strong> {summary?.activeDayCount || 0}
              </Typography>
              <Typography variant="body1">
                <strong>Exercise blocks:</strong> {summary?.activeExerciseCount || 0}
              </Typography>
              <Typography variant="body1">
                <strong>Completed sessions logged:</strong> {summary?.completedPlanSessions || 0}
              </Typography>
            </Stack>

            {assignment.focus_goal || profile?.fitness_goal ? (
              <Typography color="text.secondary">
                <strong>Focus:</strong> {assignment.focus_goal || profile?.fitness_goal}
              </Typography>
            ) : null}
          </>
        ) : (
          <Stack spacing={1.25}>
            <Typography fontWeight={700}>
              Ask a coach to assign a program
            </Typography>
            <Typography color="text.secondary" lineHeight={1.75}>
              Once a trainer assigns a workout template, you’ll see weekly sessions, target exercises, and completion tracking here.
            </Typography>
          </Stack>
        )}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button
            component={RouterLink}
            to={PATHS.workoutPlan}
            variant="contained"
            startIcon={<FitnessCenter />}
            sx={{ bgcolor: '#ff2625', textTransform: 'none', borderRadius: 999, '&:hover': { bgcolor: '#df1d1d' } }}
          >
            Open workout plan
          </Button>
          <Button
            component={RouterLink}
            to={PATHS.dashboard}
            variant="outlined"
            startIcon={<CalendarMonth />}
            sx={{ textTransform: 'none', borderRadius: 999 }}
          >
            Stay on dashboard
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
};

export default WorkoutPlanSummaryCard;
