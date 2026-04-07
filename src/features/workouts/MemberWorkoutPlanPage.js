import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
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
  Add,
  CalendarMonth,
  DeleteOutline,
  EditOutlined,
  FitnessCenter,
  PlaylistAddCheck,
  TaskAlt,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

import { PATHS } from '../../app/paths';
import EmptyStateCard from '../../components/common/EmptyStateCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import MetricCard from '../../components/common/MetricCard';
import SetupNotice from '../../components/common/SetupNotice';
import { useAuth } from '../../context/AuthContext';
import {
  fetchWorkoutAssignments,
  fetchWorkouts,
  saveWorkout,
} from '../../services/gymService';
import {
  formatProgramDate,
  formatProgramDateRange,
  getWorkoutAssignmentStatusChipSx,
  getWorkoutAssignmentStatusMeta,
  sortWorkoutAssignments,
} from './workoutProgrammingHelpers';

const createEmptyWorkoutEntry = () => ({
  exercise_name: '',
  sets: '',
  reps: '',
  weight: '',
});

const createEmptyWorkoutForm = () => ({
  id: '',
  title: '',
  workout_date: new Date().toISOString().slice(0, 10),
  status: 'completed',
  notes: '',
  program_assignment_id: '',
  program_day_id: '',
  entries: [createEmptyWorkoutEntry()],
});

const buildWorkoutFormFromDay = (assignment, day, status = 'completed') => ({
  id: '',
  title: `${assignment?.program?.name || 'Workout plan'} • ${day?.title || 'Session'}`,
  workout_date: new Date().toISOString().slice(0, 10),
  status,
  notes: day?.notes || '',
  program_assignment_id: assignment?.id || '',
  program_day_id: day?.id || '',
  entries: (day?.exercises || []).length
    ? day.exercises.map((exercise) => ({
      exercise_name: exercise.exercise_name || exercise.library_exercise?.name || '',
      sets: exercise.prescribed_sets ?? '',
      reps: exercise.prescribed_reps || '',
      weight: exercise.prescribed_weight || '',
    }))
    : [createEmptyWorkoutEntry()],
});

const MemberWorkoutPlanPage = () => {
  const {
    user,
    profile,
    loading,
    isConfigured,
  } = useAuth();

  const [assignments, setAssignments] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [workoutForm, setWorkoutForm] = useState(createEmptyWorkoutForm);
  const [formContext, setFormContext] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [savingWorkout, setSavingWorkout] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const loadWorkoutPlan = useCallback(async () => {
    if (!user || !isConfigured) {
      setPageLoading(false);
      return;
    }

    try {
      setPageLoading(true);
      const [assignmentRows, workoutRows] = await Promise.all([
        fetchWorkoutAssignments({
          memberId: user.id,
          limit: 20,
        }),
        fetchWorkouts(user.id),
      ]);

      const nextAssignments = sortWorkoutAssignments(assignmentRows);
      setAssignments(nextAssignments);
      setWorkouts(workoutRows);

      if (!selectedAssignmentId && nextAssignments[0]?.id) {
        setSelectedAssignmentId(nextAssignments[0].id);
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to load your workout plan.',
      });
    } finally {
      setPageLoading(false);
    }
  }, [isConfigured, selectedAssignmentId, user]);

  useEffect(() => {
    loadWorkoutPlan();
  }, [loadWorkoutPlan]);

  const activeAssignment = useMemo(() => {
    if (!assignments.length) {
      return null;
    }

    if (selectedAssignmentId) {
      return assignments.find((assignment) => assignment.id === selectedAssignmentId) || assignments[0];
    }

    return assignments[0];
  }, [assignments, selectedAssignmentId]);

  const linkedWorkouts = useMemo(() => (
    activeAssignment
      ? workouts.filter((workout) => workout.program_assignment_id === activeAssignment.id)
      : []
  ), [activeAssignment, workouts]);

  const completedWorkouts = useMemo(() => (
    linkedWorkouts.filter((workout) => workout.status === 'completed')
  ), [linkedWorkouts]);

  const completionMap = useMemo(() => (
    completedWorkouts.reduce((accumulator, workout) => {
      if (!workout.program_day_id) {
        return accumulator;
      }

      accumulator[workout.program_day_id] = (accumulator[workout.program_day_id] || 0) + 1;
      return accumulator;
    }, {})
  ), [completedWorkouts]);

  const assignmentStats = useMemo(() => {
    const templateDays = activeAssignment?.program?.days || [];
    const linkedDayIds = new Set(linkedWorkouts.map((workout) => workout.program_day_id).filter(Boolean));

    return {
      templateDays: templateDays.length,
      exerciseBlocks: templateDays.reduce((count, day) => count + (day.exercises?.length || 0), 0),
      loggedSessions: linkedWorkouts.length,
      completedDays: templateDays.filter((day) => linkedDayIds.has(day.id)).length,
    };
  }, [activeAssignment, linkedWorkouts]);

  const resetWorkoutForm = () => {
    setWorkoutForm(createEmptyWorkoutForm());
    setFormContext(null);
  };

  const updateWorkoutField = (field) => (event) => {
    setWorkoutForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const updateWorkoutEntryField = (index, field) => (event) => {
    const { value } = event.target;

    setWorkoutForm((current) => ({
      ...current,
      entries: current.entries.map((entry, entryIndex) => (
        entryIndex === index ? { ...entry, [field]: value } : entry
      )),
    }));
  };

  const addWorkoutEntry = () => {
    setWorkoutForm((current) => ({
      ...current,
      entries: [...current.entries, createEmptyWorkoutEntry()],
    }));
  };

  const removeWorkoutEntry = (index) => {
    setWorkoutForm((current) => ({
      ...current,
      entries: current.entries.length === 1
        ? current.entries
        : current.entries.filter((_entry, entryIndex) => entryIndex !== index),
    }));
  };

  const handlePrefillDay = (day, status = 'completed') => {
    if (!activeAssignment) {
      return;
    }

    setWorkoutForm(buildWorkoutFormFromDay(activeAssignment, day, status));
    setFormContext({ dayId: day.id, dayTitle: day.title, status });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditWorkout = (workout) => {
    setWorkoutForm({
      id: workout.id,
      title: workout.title,
      workout_date: workout.workout_date,
      status: workout.status,
      notes: workout.notes || '',
      program_assignment_id: workout.program_assignment_id || activeAssignment?.id || '',
      program_day_id: workout.program_day_id || '',
      entries: workout.entries?.length
        ? workout.entries.map((entry) => ({
          exercise_name: entry.exercise_name || '',
          sets: entry.sets ?? '',
          reps: entry.reps ?? '',
          weight: entry.weight ?? '',
        }))
        : [createEmptyWorkoutEntry()],
    });

    const matchingDay = activeAssignment?.program?.days?.find((day) => day.id === workout.program_day_id);

    setFormContext({
      dayId: workout.program_day_id || '',
      dayTitle: matchingDay?.title || 'Workout',
      status: workout.status,
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveWorkout = async (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });

    try {
      setSavingWorkout(true);
      const savedWorkout = await saveWorkout(user.id, workoutForm);

      setWorkouts((current) => {
        const nextRows = current.some((workout) => workout.id === savedWorkout.id)
          ? current.map((workout) => (workout.id === savedWorkout.id ? savedWorkout : workout))
          : [savedWorkout, ...current];

        return [...nextRows].sort((left, right) => (
          `${right.workout_date || ''}${right.created_at || ''}`.localeCompare(`${left.workout_date || ''}${left.created_at || ''}`)
        ));
      });

      setFeedback({
        type: 'success',
        message: workoutForm.id ? 'Workout plan log updated.' : 'Workout plan session saved.',
      });
      resetWorkoutForm();
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to save this workout log.',
      });
    } finally {
      setSavingWorkout(false);
    }
  };

  if (loading || pageLoading) {
    return <LoadingScreen message="Loading your workout plan..." />;
  }

  return (
    <Box sx={{ py: { xs: 2, md: 4 } }}>
      <SetupNotice title="Workout programming needs Supabase setup" />

      <Stack spacing={1.5} mb={4}>
        <Typography color="#ff2625" fontWeight={700}>
          Trainer workout programming
        </Typography>
        <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '32px', md: '44px' } }}>
          Follow your assigned workout plan
        </Typography>
        <Typography color="text.secondary" maxWidth="920px">
          View trainer-built workout blocks, review exercise prescriptions, and log each completed session against your current plan.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button
            component={RouterLink}
            to={PATHS.dashboard}
            variant="outlined"
            sx={{ borderRadius: 999, textTransform: 'none', alignSelf: 'flex-start' }}
          >
            Back to dashboard
          </Button>
          <Button
            component={RouterLink}
            to={PATHS.account}
            variant="text"
            sx={{ textTransform: 'none', alignSelf: 'flex-start' }}
          >
            Update account details
          </Button>
        </Stack>
      </Stack>

      {feedback.message ? (
        <Alert severity={feedback.type || 'info'} sx={{ mb: 3, borderRadius: 3 }}>
          {feedback.message}
        </Alert>
      ) : null}

      {!assignments.length ? (
        <EmptyStateCard
          title="No workout program has been assigned yet"
          description="A trainer or staff member needs to create a workout template and assign it to your profile before plan tracking can begin."
          action={(
            <Button
              component={RouterLink}
              to={PATHS.dashboard}
              variant="contained"
              sx={{ bgcolor: '#ff2625', borderRadius: 999, textTransform: 'none', '&:hover': { bgcolor: '#df1d1d' } }}
            >
              Return to dashboard
            </Button>
          )}
        />
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Template days"
              value={assignmentStats.templateDays}
              caption="Structured sessions in this program"
              icon={PlaylistAddCheck}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Exercise blocks"
              value={assignmentStats.exerciseBlocks}
              caption="Unique prescriptions across the plan"
              icon={FitnessCenter}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Logged sessions"
              value={assignmentStats.loggedSessions}
              caption={`${completedWorkouts.length} completed`}
              icon={TaskAlt}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Days covered"
              value={assignmentStats.completedDays}
              caption="Template days with at least one saved log"
              icon={CalendarMonth}
            />
          </Grid>

          <Grid item xs={12}>
            <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
              <Stack spacing={2.5}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography color="#ff2625" fontWeight={700}>
                      Assignment overview
                    </Typography>
                    <Typography variant="h5" fontWeight={800} mt={0.5}>
                      {activeAssignment?.program?.name || 'Workout program'}
                    </Typography>
                    <Typography color="text.secondary" mt={1}>
                      {activeAssignment?.program?.goal || activeAssignment?.program?.description || 'No additional goal notes yet.'}
                    </Typography>
                  </Box>

                  <TextField
                    select
                    label="Assigned plan"
                    value={activeAssignment?.id || ''}
                    onChange={(event) => setSelectedAssignmentId(event.target.value)}
                    sx={{ minWidth: { md: 260 } }}
                  >
                    {assignments.map((assignment) => (
                      <MenuItem key={assignment.id} value={assignment.id}>
                        {assignment.program?.name || 'Untitled program'} • {getWorkoutAssignmentStatusMeta(assignment.assignment_status).label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    label={getWorkoutAssignmentStatusMeta(activeAssignment?.assignment_status).label}
                    sx={getWorkoutAssignmentStatusChipSx(activeAssignment?.assignment_status)}
                  />
                  <Chip label={`${activeAssignment?.program?.sessions_per_week || assignmentStats.templateDays} sessions/week`} />
                  <Chip label={`${activeAssignment?.program?.duration_weeks || 0} weeks`} />
                </Stack>

                <Stack spacing={1}>
                  <Typography variant="body1">
                    <strong>Schedule:</strong> {formatProgramDateRange(activeAssignment?.start_date, activeAssignment?.end_date)}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Focus goal:</strong> {activeAssignment?.focus_goal || profile?.fitness_goal || 'Not set yet'}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Coach notes:</strong> {activeAssignment?.notes || 'No custom assignment note yet'}
                  </Typography>
                </Stack>
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={7}>
            <Stack spacing={3}>
              {(activeAssignment?.program?.days || []).map((day) => (
                <Paper key={day.id || day.day_index} className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
                  <Stack spacing={2}>
                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                      <Box>
                        <Typography color="#ff2625" fontWeight={700}>
                          Day {day.day_index}
                        </Typography>
                        <Typography variant="h5" fontWeight={800} mt={0.5}>
                          {day.title}
                        </Typography>
                        <Typography color="text.secondary" mt={0.75}>
                          {day.focus_area || 'General training day'}
                        </Typography>
                      </Box>

                      <Stack alignItems={{ xs: 'flex-start', md: 'flex-end' }} spacing={1}>
                        <Chip
                          label={completionMap[day.id] ? `${completionMap[day.id]} logged` : 'Not logged yet'}
                          sx={{
                            bgcolor: completionMap[day.id] ? '#ecfdf3' : '#f8fafc',
                            color: completionMap[day.id] ? '#047857' : '#475569',
                            fontWeight: 700,
                          }}
                        />
                        {day.target_duration_minutes ? (
                          <Typography variant="body2" color="text.secondary">
                            Target: {day.target_duration_minutes} min
                          </Typography>
                        ) : null}
                      </Stack>
                    </Stack>

                    {day.notes ? (
                      <Typography color="text.secondary">
                        {day.notes}
                      </Typography>
                    ) : null}

                    <Stack spacing={1.25}>
                      {(day.exercises || []).map((exercise, index) => (
                        <Paper key={exercise.id || `${day.id}-exercise-${index}`} variant="outlined" sx={{ p: 2, borderRadius: 3, boxShadow: 'none' }}>
                          <Stack spacing={0.75}>
                            <Typography fontWeight={800}>
                              {index + 1}. {exercise.exercise_name || exercise.library_exercise?.name || 'Exercise'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {[
                                exercise.prescribed_sets ? `${exercise.prescribed_sets} sets` : null,
                                exercise.prescribed_reps ? `${exercise.prescribed_reps} reps` : null,
                                exercise.prescribed_weight ? exercise.prescribed_weight : null,
                                exercise.rest_seconds ? `${exercise.rest_seconds}s rest` : null,
                                exercise.tempo ? `Tempo ${exercise.tempo}` : null,
                              ].filter(Boolean).join(' • ') || 'Prescription not set'}
                            </Typography>
                            {exercise.trainer_notes ? (
                              <Typography variant="body2" color="text.secondary">
                                {exercise.trainer_notes}
                              </Typography>
                            ) : null}
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                      <Button
                        variant="contained"
                        startIcon={<TaskAlt />}
                        onClick={() => handlePrefillDay(day, 'completed')}
                        sx={{ bgcolor: '#ff2625', borderRadius: 999, textTransform: 'none', '&:hover': { bgcolor: '#df1d1d' } }}
                      >
                        Log completed session
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<PlaylistAddCheck />}
                        onClick={() => handlePrefillDay(day, 'planned')}
                        sx={{ borderRadius: 999, textTransform: 'none' }}
                      >
                        Save as planned
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Grid>

          <Grid item xs={12} lg={5}>
            <Stack spacing={3}>
              <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
                <Stack spacing={1.5} mb={3}>
                  <Typography color="#ff2625" fontWeight={700}>
                    Session logger
                  </Typography>
                  <Typography variant="h5" fontWeight={800}>
                    {(() => {
                      if (workoutForm.id) return 'Edit workout plan log';
                      if (formContext) return `Log ${formContext.dayTitle}`;
                      return 'Create a plan-linked log';
                    })()}
                  </Typography>
                  <Typography color="text.secondary">
                    Save your completed or planned sessions against this trainer assignment.
                  </Typography>
                </Stack>

                <Box component="form" onSubmit={handleSaveWorkout}>
                  <Stack spacing={2.5}>
                    <TextField
                      label="Workout title"
                      value={workoutForm.title}
                      onChange={updateWorkoutField('title')}
                      fullWidth
                      required
                    />

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField
                        label="Workout date"
                        type="date"
                        value={workoutForm.workout_date}
                        onChange={updateWorkoutField('workout_date')}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        required
                      />
                      <TextField
                        select
                        label="Status"
                        value={workoutForm.status}
                        onChange={updateWorkoutField('status')}
                        fullWidth
                      >
                        <MenuItem value="completed">Completed</MenuItem>
                        <MenuItem value="planned">Planned</MenuItem>
                      </TextField>
                    </Stack>

                    <TextField
                      label="Notes"
                      value={workoutForm.notes}
                      onChange={updateWorkoutField('notes')}
                      fullWidth
                      multiline
                      minRows={3}
                    />

                    <Divider />

                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="h6" fontWeight={800}>
                        Exercise results
                      </Typography>
                      <Button
                        startIcon={<Add />}
                        onClick={addWorkoutEntry}
                        sx={{ textTransform: 'none' }}
                      >
                        Add row
                      </Button>
                    </Stack>

                    <Stack spacing={2}>
                      {workoutForm.entries.map((entry, index) => (
                        <Paper key={`workout-entry-${index}`} variant="outlined" sx={{ p: 2, borderRadius: 3, boxShadow: 'none' }}>
                          <Stack spacing={2}>
                            <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="center">
                              <Typography fontWeight={700}>
                                Exercise {index + 1}
                              </Typography>
                              <IconButton
                                size="small"
                                color="error"
                                disabled={workoutForm.entries.length === 1}
                                onClick={() => removeWorkoutEntry(index)}
                              >
                                <DeleteOutline fontSize="small" />
                              </IconButton>
                            </Stack>

                            <TextField
                              label="Exercise name"
                              value={entry.exercise_name}
                              onChange={updateWorkoutEntryField(index, 'exercise_name')}
                              fullWidth
                              required
                            />

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                              <TextField
                                label="Sets"
                                type="number"
                                value={entry.sets}
                                onChange={updateWorkoutEntryField(index, 'sets')}
                                fullWidth
                              />
                              <TextField
                                label="Reps"
                                value={entry.reps}
                                onChange={updateWorkoutEntryField(index, 'reps')}
                                fullWidth
                              />
                              <TextField
                                label="Weight"
                                value={entry.weight}
                                onChange={updateWorkoutEntryField(index, 'weight')}
                                fullWidth
                              />
                            </Stack>
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                      <Button
                        type="submit"
                        variant="contained"
                        startIcon={<TaskAlt />}
                        disabled={savingWorkout || !profile?.is_active}
                        sx={{ bgcolor: '#ff2625', borderRadius: 999, textTransform: 'none', '&:hover': { bgcolor: '#df1d1d' } }}
                      >
                        {savingWorkout ? 'Saving session...' : 'Save session'}
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={resetWorkoutForm}
                        sx={{ borderRadius: 999, textTransform: 'none' }}
                      >
                        Reset form
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              </Paper>

              <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
                <Stack spacing={2}>
                  <Stack spacing={0.5}>
                    <Typography color="#ff2625" fontWeight={700}>
                      Recent plan activity
                    </Typography>
                    <Typography variant="h6" fontWeight={800}>
                      Sessions linked to this assignment
                    </Typography>
                  </Stack>

                  {!linkedWorkouts.length ? (
                    <Typography color="text.secondary">
                      No logs are linked to this program yet. Choose a day and save your first session.
                    </Typography>
                  ) : (
                    linkedWorkouts.slice(0, 6).map((workout) => (
                      <Paper key={workout.id} variant="outlined" sx={{ p: 2, borderRadius: 3, boxShadow: 'none' }}>
                        <Stack spacing={1.25}>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                            <Box>
                              <Typography fontWeight={800}>
                                {workout.title}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {formatProgramDate(workout.workout_date)}
                              </Typography>
                            </Box>

                            <Stack direction="row" spacing={1}>
                              <Chip
                                label={workout.status}
                                sx={{
                                  bgcolor: workout.status === 'completed' ? '#ecfdf3' : '#eff6ff',
                                  color: workout.status === 'completed' ? '#047857' : '#1d4ed8',
                                  fontWeight: 700,
                                  textTransform: 'capitalize',
                                }}
                              />
                              <IconButton size="small" onClick={() => handleEditWorkout(workout)}>
                                <EditOutlined fontSize="small" />
                              </IconButton>
                            </Stack>
                          </Stack>

                          <Typography color="text.secondary">
                            {(workout.entries || []).length} exercise row(s)
                          </Typography>
                        </Stack>
                      </Paper>
                    ))
                  )}
                </Stack>
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default MemberWorkoutPlanPage;
