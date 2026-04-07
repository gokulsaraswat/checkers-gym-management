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
  DeleteOutline,
  EditOutlined,
  EventAvailable,
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
  deleteProgressCheckpoint,
  deleteWorkout,
  fetchProgressCheckpoints,
  fetchUpcomingClassBookings,
  fetchWorkoutAssignments,
  fetchWorkouts,
  saveProgressCheckpoint,
  saveWorkout,
} from '../../services/gymService';
import {
  getMembershipStatusChipSx,
  getMembershipStatusLabel,
  getWaiverChipSx,
  getWaiverStatusLabel,
} from '../members/memberLifecycle';
import DashboardAlertsCard from './components/DashboardAlertsCard';
import ProgressSnapshotCard from './components/ProgressSnapshotCard';
import UpcomingClassesCard from './components/UpcomingClassesCard';
import WorkoutPlanSummaryCard from './components/WorkoutPlanSummaryCard';
import {
  buildDashboardAlerts,
  buildProgressSummary,
  buildUpcomingClassSummary,
  buildWorkoutPlanSummary,
  buildWorkoutStats,
  createEmptyProgressForm,
  formatDashboardDate,
  getProfileCompleteness,
  sortProgressRows,
  sortWorkoutRows,
} from './dashboardHelpers';

const createEmptyWorkoutForm = () => ({
  id: '',
  title: '',
  workout_date: new Date().toISOString().slice(0, 10),
  status: 'completed',
  notes: '',
  program_assignment_id: '',
  program_day_id: '',
  entries: [
    {
      exercise_name: '',
      sets: '',
      reps: '',
      weight: '',
    },
  ],
});

const DashboardPage = () => {
  const {
    user,
    profile,
    loading,
    isConfigured,
    refreshProfile,
  } = useAuth();

  const [workouts, setWorkouts] = useState([]);
  const [workoutAssignments, setWorkoutAssignments] = useState([]);
  const [progressCheckpoints, setProgressCheckpoints] = useState([]);
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [savingWorkout, setSavingWorkout] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [progressFeedback, setProgressFeedback] = useState({ type: '', message: '' });
  const [form, setForm] = useState(createEmptyWorkoutForm);
  const [progressForm, setProgressForm] = useState(createEmptyProgressForm);

  const loadDashboardData = useCallback(async () => {
    if (!user || !isConfigured) {
      setPageLoading(false);
      return;
    }

    try {
      setPageLoading(true);

      await refreshProfile();

      const [
        workoutRows,
        progressRows,
        bookingRows,
        assignmentRows,
      ] = await Promise.all([
        fetchWorkouts(user.id),
        fetchProgressCheckpoints(user.id),
        fetchUpcomingClassBookings(user.id),
        fetchWorkoutAssignments({ memberId: user.id, limit: 12 }),
      ]);

      setWorkouts(sortWorkoutRows(workoutRows));
      setProgressCheckpoints(sortProgressRows(progressRows));
      setUpcomingClasses(buildUpcomingClassSummary(bookingRows).upcoming);
      setWorkoutAssignments(assignmentRows);
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to load your dashboard.' });
    } finally {
      setPageLoading(false);
    }
  }, [isConfigured, refreshProfile, user]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const workoutStats = useMemo(() => buildWorkoutStats(workouts), [workouts]);
  const workoutPlanSummary = useMemo(() => buildWorkoutPlanSummary(workouts, workoutAssignments), [workouts, workoutAssignments]);
  const progressSummary = useMemo(() => buildProgressSummary(progressCheckpoints), [progressCheckpoints]);
  const classSummary = useMemo(() => buildUpcomingClassSummary(upcomingClasses), [upcomingClasses]);
  const profileCompleteness = useMemo(() => getProfileCompleteness(profile || {}), [profile]);
  const dashboardAlerts = useMemo(() => buildDashboardAlerts({
    profile,
    workouts,
    checkpoints: progressCheckpoints,
    classBookings: upcomingClasses,
    assignments: workoutAssignments,
  }), [profile, progressCheckpoints, upcomingClasses, workoutAssignments, workouts]);

  const updateFormField = (field) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const updateEntryField = (index, field) => (event) => {
    const { value } = event.target;

    setForm((current) => ({
      ...current,
      entries: current.entries.map((entry, entryIndex) => (
        entryIndex === index ? { ...entry, [field]: value } : entry
      )),
    }));
  };

  const addEntryRow = () => {
    setForm((current) => ({
      ...current,
      entries: [
        ...current.entries,
        { exercise_name: '', sets: '', reps: '', weight: '' },
      ],
    }));
  };

  const removeEntryRow = (index) => {
    setForm((current) => ({
      ...current,
      entries: current.entries.length === 1
        ? current.entries
        : current.entries.filter((_entry, entryIndex) => entryIndex !== index),
    }));
  };

  const resetWorkoutForm = () => {
    setForm(createEmptyWorkoutForm());
  };

  const handleEditWorkout = (workout) => {
    setForm({
      id: workout.id,
      title: workout.title,
      workout_date: workout.workout_date,
      status: workout.status,
      notes: workout.notes || '',
      program_assignment_id: workout.program_assignment_id || '',
      program_day_id: workout.program_day_id || '',
      entries: workout.entries?.length
        ? workout.entries.map((entry) => ({
          exercise_name: entry.exercise_name || '',
          sets: entry.sets ?? '',
          reps: entry.reps ?? '',
          weight: entry.weight ?? '',
        }))
        : createEmptyWorkoutForm().entries,
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteWorkout = async (workoutId) => {
    if (!window.confirm('Delete this workout log?')) {
      return;
    }

    try {
      await deleteWorkout(workoutId);
      setWorkouts((current) => current.filter((workout) => workout.id !== workoutId));
      setFeedback({ type: 'success', message: 'Workout deleted.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to delete workout.' });
    }
  };

  const handleSubmitWorkout = async (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });

    try {
      setSavingWorkout(true);
      const savedWorkout = await saveWorkout(user.id, form);

      setWorkouts((current) => {
        const nextWorkouts = current.some((item) => item.id === savedWorkout.id)
          ? current.map((item) => (item.id === savedWorkout.id ? savedWorkout : item))
          : [savedWorkout, ...current];

        return sortWorkoutRows(nextWorkouts);
      });

      setFeedback({
        type: 'success',
        message: form.id ? 'Workout updated successfully.' : 'Workout logged successfully.',
      });

      resetWorkoutForm();
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to save workout.' });
    } finally {
      setSavingWorkout(false);
    }
  };

  const updateProgressField = (field) => (event) => {
    setProgressForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const resetProgressForm = () => {
    setProgressForm(createEmptyProgressForm());
  };

  const handleSaveProgress = async (event) => {
    event.preventDefault();
    setProgressFeedback({ type: '', message: '' });

    try {
      setSavingProgress(true);
      const savedCheckpoint = await saveProgressCheckpoint(user.id, progressForm);

      setProgressCheckpoints((current) => sortProgressRows([
        savedCheckpoint,
        ...current.filter((checkpoint) => checkpoint.id !== savedCheckpoint.id),
      ]));

      setProgressFeedback({
        type: 'success',
        message: 'Progress snapshot saved.',
      });
      resetProgressForm();
    } catch (error) {
      setProgressFeedback({
        type: 'error',
        message: error.message || 'Unable to save progress snapshot.',
      });
    } finally {
      setSavingProgress(false);
    }
  };

  const handleDeleteProgress = async (checkpointId) => {
    if (!window.confirm('Delete this progress snapshot?')) {
      return;
    }

    try {
      await deleteProgressCheckpoint(checkpointId);
      setProgressCheckpoints((current) => current.filter((checkpoint) => checkpoint.id !== checkpointId));
      setProgressFeedback({
        type: 'success',
        message: 'Progress snapshot removed.',
      });
    } catch (error) {
      setProgressFeedback({
        type: 'error',
        message: error.message || 'Unable to delete progress snapshot.',
      });
    }
  };

  if (loading || pageLoading) {
    return <LoadingScreen message="Loading your member dashboard..." />;
  }

  return (
    <Box sx={{ py: { xs: 2, md: 4 } }}>
      <SetupNotice title="Dashboard features need Supabase setup" />

      {!profile ? (
        <Alert severity="warning" sx={{ borderRadius: 3 }}>
          You are authenticated, but no profile record was found. Run <code>supabase/schema.sql</code> and refresh the
          app.
        </Alert>
      ) : (
        <>
          <Stack spacing={1.5} mb={4}>
            <Typography color="#ff2625" fontWeight={700}>
              Member dashboard
            </Typography>
            <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '32px', md: '46px' } }}>
              Welcome back, {profile.full_name || profile.email}
            </Typography>
            <Typography color="text.secondary" maxWidth="920px">
              See your membership status, progress snapshots, upcoming classes, and training summary from one place.
            </Typography>
          </Stack>

          {feedback.message ? (
            <Alert severity={feedback.type || 'info'} sx={{ mb: 3, borderRadius: 3 }}>
              {feedback.message}
            </Alert>
          ) : null}

          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <MetricCard
                title="Profile completeness"
                value={`${profileCompleteness}%`}
                caption="Member record filled"
                icon={TaskAlt}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <MetricCard
                title="Workout logs"
                value={workoutStats.totalWorkouts}
                caption={`${workoutStats.recentWorkouts} in the last 7 days`}
                icon={FitnessCenter}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <MetricCard
                title="Planned sessions"
                value={workoutPlanSummary.plannedWorkouts}
                caption={workoutPlanSummary.nextPlannedWorkout
                  ? `Next: ${formatDashboardDate(workoutPlanSummary.nextPlannedWorkout.workout_date)}`
                  : 'No upcoming plan yet'}
                icon={PlaylistAddCheck}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <MetricCard
                title="Upcoming classes"
                value={classSummary.upcomingCount}
                caption={classSummary.waitlistCount ? `${classSummary.waitlistCount} on waitlist` : 'Booked coached sessions'}
                icon={EventAvailable}
              />
            </Grid>

            <Grid item xs={12} lg={4}>
              <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
                <Stack spacing={2}>
                  <Typography color="#ff2625" fontWeight={700}>
                    Membership at a glance
                  </Typography>
                  <Typography variant="h5" fontWeight={800}>
                    {profile.full_name || profile.email}
                  </Typography>

                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip
                      label={getMembershipStatusLabel(profile.membership_status)}
                      sx={getMembershipStatusChipSx(profile.membership_status)}
                    />
                    <Chip
                      label={getWaiverStatusLabel(profile)}
                      sx={getWaiverChipSx(Boolean(profile.waiver_signed_at))}
                    />
                    <Chip label={profile.role} />
                  </Stack>

                  <Divider />

                  <Stack spacing={1.2}>
                    <Typography variant="body1">
                      <strong>Plan:</strong> {profile.plan?.name || 'No plan assigned yet'}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Account access:</strong> {profile.is_active ? 'Enabled' : 'Disabled'}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Member since:</strong> {formatDashboardDate(profile.member_since)}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Membership renews/ends:</strong> {formatDashboardDate(profile.membership_end_date)}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Next billing:</strong> {formatDashboardDate(profile.next_billing_date)}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Emergency contact:</strong> {profile.emergency_contact_name || 'Not added yet'}
                    </Typography>
                  </Stack>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} pt={0.5}>
                    <Button
                      component={RouterLink}
                      to={PATHS.membership}
                      variant="contained"
                      sx={{
                        bgcolor: '#ff2625',
                        textTransform: 'none',
                        borderRadius: 999,
                        '&:hover': { bgcolor: '#df1d1d' },
                      }}
                    >
                      Open membership
                    </Button>

                    <Button
                      component={RouterLink}
                      to={PATHS.account}
                      variant="outlined"
                      sx={{ textTransform: 'none', borderRadius: 999 }}
                    >
                      Account settings
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} lg={4}>
              <WorkoutPlanSummaryCard summary={workoutPlanSummary} profile={profile} />
            </Grid>

            <Grid item xs={12} lg={4}>
              <DashboardAlertsCard alerts={dashboardAlerts} />
            </Grid>

            <Grid item xs={12} lg={7}>
              <ProgressSnapshotCard
                summary={progressSummary}
                checkpoints={progressCheckpoints}
                form={progressForm}
                feedback={progressFeedback}
                saving={savingProgress}
                onFieldChange={updateProgressField}
                onSubmit={handleSaveProgress}
                onDelete={handleDeleteProgress}
                disableActions={!profile.is_active}
              />
            </Grid>

            <Grid item xs={12} lg={5}>
              <UpcomingClassesCard bookings={classSummary.upcoming} />
            </Grid>

            <Grid item xs={12} lg={5}>
              <Paper
                id="workout-tracker"
                className="surface-card"
                sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}
              >
                <Stack spacing={1.5} mb={3}>
                  <Typography color="#ff2625" fontWeight={700}>
                    Workout tracker
                  </Typography>
                  <Typography variant="h5" fontWeight={800}>
                    {form.id ? 'Edit workout log' : 'Log a new workout'}
                  </Typography>
                  <Typography color="text.secondary">
                    Save planned or completed sessions and attach as many exercise rows as you need.
                  </Typography>
                </Stack>

                <Box component="form" onSubmit={handleSubmitWorkout}>
                  <Stack spacing={2.5}>
                    <TextField
                      label="Workout title"
                      value={form.title}
                      onChange={updateFormField('title')}
                      fullWidth
                      required
                    />

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField
                        label="Workout date"
                        type="date"
                        value={form.workout_date}
                        onChange={updateFormField('workout_date')}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        required
                      />
                      <TextField
                        select
                        label="Status"
                        value={form.status}
                        onChange={updateFormField('status')}
                        fullWidth
                      >
                        <MenuItem value="completed">Completed</MenuItem>
                        <MenuItem value="planned">Planned</MenuItem>
                      </TextField>
                    </Stack>

                    <TextField
                      label="Notes"
                      value={form.notes}
                      onChange={updateFormField('notes')}
                      fullWidth
                      multiline
                      minRows={3}
                    />

                    <Divider />

                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography fontWeight={800}>Exercise entries</Typography>
                      <Button startIcon={<Add />} onClick={addEntryRow} sx={{ textTransform: 'none' }}>
                        Add row
                      </Button>
                    </Stack>

                    <Stack spacing={2}>
                      {form.entries.map((entry, index) => (
                        <Paper
                          key={`entry-${index}`}
                          variant="outlined"
                          sx={{ p: 2, borderRadius: 3, borderColor: '#e5e7eb' }}
                        >
                          <Stack spacing={2}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography fontWeight={700}>Entry {index + 1}</Typography>
                              <IconButton onClick={() => removeEntryRow(index)} disabled={form.entries.length === 1}>
                                <DeleteOutline />
                              </IconButton>
                            </Stack>

                            <TextField
                              label="Exercise name"
                              value={entry.exercise_name}
                              onChange={updateEntryField(index, 'exercise_name')}
                              fullWidth
                              required
                            />

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                              <TextField
                                label="Sets"
                                type="number"
                                value={entry.sets}
                                onChange={updateEntryField(index, 'sets')}
                                fullWidth
                              />
                              <TextField
                                label="Reps"
                                type="number"
                                value={entry.reps}
                                onChange={updateEntryField(index, 'reps')}
                                fullWidth
                              />
                              <TextField
                                label="Weight"
                                type="number"
                                value={entry.weight}
                                onChange={updateEntryField(index, 'weight')}
                                fullWidth
                              />
                            </Stack>
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={savingWorkout || !profile.is_active}
                        sx={{
                          bgcolor: '#ff2625',
                          textTransform: 'none',
                          borderRadius: 999,
                          py: 1.4,
                          flex: 1,
                          '&:hover': { bgcolor: '#df1d1d' },
                        }}
                      >
                        {(() => {
                          if (savingWorkout) return 'Saving...';
                          return form.id ? 'Update workout' : 'Save workout';
                        })()}
                      </Button>
                      <Button
                        type="button"
                        variant="outlined"
                        onClick={resetWorkoutForm}
                        sx={{ textTransform: 'none', borderRadius: 999, py: 1.4, flex: 1 }}
                      >
                        Reset
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} lg={7}>
              <Stack spacing={3}>
                <Typography variant="h5" fontWeight={800}>
                  Recent workouts
                </Typography>

                {!workouts.length ? (
                  <EmptyStateCard
                    title="No workouts logged yet"
                    description="Create your first workout entry to start building a consistent training history."
                  />
                ) : (
                  workouts.map((workout) => (
                    <Paper
                      key={workout.id}
                      className="surface-card"
                      sx={{ p: 3, borderRadius: 4, background: '#fff' }}
                    >
                      <Stack spacing={2}>
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          justifyContent="space-between"
                          spacing={2}
                          alignItems={{ sm: 'center' }}
                        >
                          <Box>
                            <Typography variant="h6" fontWeight={800}>
                              {workout.title}
                            </Typography>
                            <Typography color="text.secondary">
                              {formatDashboardDate(workout.workout_date)} • {workout.status}
                            </Typography>
                          </Box>

                          <Stack direction="row" spacing={1}>
                            <Button
                              startIcon={<EditOutlined />}
                              onClick={() => handleEditWorkout(workout)}
                              sx={{ textTransform: 'none' }}
                            >
                              Edit
                            </Button>
                            <Button
                              color="error"
                              startIcon={<DeleteOutline />}
                              onClick={() => handleDeleteWorkout(workout.id)}
                              sx={{ textTransform: 'none' }}
                            >
                              Delete
                            </Button>
                          </Stack>
                        </Stack>

                        {workout.notes ? (
                          <Typography color="text.secondary">{workout.notes}</Typography>
                        ) : null}

                        <Divider />

                        <Stack spacing={1.5}>
                          {(workout.entries || []).map((entry, index) => (
                            <Paper
                              key={`${workout.id}-entry-${index}`}
                              variant="outlined"
                              sx={{ p: 2, borderRadius: 3, borderColor: '#e5e7eb' }}
                            >
                              <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={1.5}
                                justifyContent="space-between"
                              >
                                <Typography fontWeight={700} textTransform="capitalize">
                                  {entry.exercise_name}
                                </Typography>
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                  {entry.sets !== null && entry.sets !== undefined ? <Chip label={`Sets: ${entry.sets}`} /> : null}
                                  {entry.reps !== null && entry.reps !== undefined ? <Chip label={`Reps: ${entry.reps}`} /> : null}
                                  {entry.weight !== null && entry.weight !== undefined ? <Chip label={`Weight: ${entry.weight}`} /> : null}
                                </Stack>
                              </Stack>
                            </Paper>
                          ))}
                        </Stack>
                      </Stack>
                    </Paper>
                  ))
                )}
              </Stack>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default DashboardPage;
