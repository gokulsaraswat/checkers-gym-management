import React, { useEffect, useMemo, useState } from 'react';
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
  Checklist,
  DeleteOutline,
  EditOutlined,
  FitnessCenter,
  Insights,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

import EmptyStateCard from '../../components/common/EmptyStateCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import MetricCard from '../../components/common/MetricCard';
import SetupNotice from '../../components/common/SetupNotice';
import { useAuth } from '../../context/AuthContext';
import { deleteWorkout, fetchWorkouts, saveWorkout } from '../../services/gymService';

const emptyWorkoutForm = {
  id: '',
  title: '',
  workout_date: new Date().toISOString().slice(0, 10),
  status: 'completed',
  notes: '',
  entries: [
    {
      exercise_name: '',
      sets: '',
      reps: '',
      weight: '',
    },
  ],
};

const formatDate = (value) => new Date(value).toLocaleDateString();

const DashboardPage = () => {
  const { user, profile, loading, refreshProfile } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [savingWorkout, setSavingWorkout] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [form, setForm] = useState(emptyWorkoutForm);

  const loadDashboardData = async () => {
    if (!user) {
      return;
    }

    try {
      setPageLoading(true);
      await refreshProfile();
      const workoutRows = await fetchWorkouts(user.id);
      setWorkouts(workoutRows);
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to load your dashboard.' });
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const stats = useMemo(() => {
    const totalWorkouts = workouts.length;
    const totalEntries = workouts.reduce((sum, workout) => sum + (workout.entries?.length || 0), 0);
    const completedWorkouts = workouts.filter((workout) => workout.status === 'completed').length;
    const recentWorkouts = workouts.filter((workout) => {
      const workoutTime = new Date(workout.workout_date).getTime();
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      return workoutTime >= sevenDaysAgo;
    }).length;

    return {
      totalWorkouts,
      totalEntries,
      completedWorkouts,
      recentWorkouts,
    };
  }, [workouts]);

  const updateFormField = (field) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const updateEntryField = (index, field) => (event) => {
    const value = event.target.value;
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

  const resetForm = () => {
    setForm(emptyWorkoutForm);
  };

  const handleEditWorkout = (workout) => {
    setForm({
      id: workout.id,
      title: workout.title,
      workout_date: workout.workout_date,
      status: workout.status,
      notes: workout.notes || '',
      entries: workout.entries?.length
        ? workout.entries.map((entry) => ({
            exercise_name: entry.exercise_name || '',
            sets: entry.sets ?? '',
            reps: entry.reps ?? '',
            weight: entry.weight ?? '',
          }))
        : emptyWorkoutForm.entries,
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });

    try {
      setSavingWorkout(true);
      const savedWorkout = await saveWorkout(user.id, form);

      setWorkouts((current) => {
        const existing = current.find((item) => item.id === savedWorkout.id);

        if (existing) {
          return current.map((item) => (item.id === savedWorkout.id ? savedWorkout : item));
        }

        return [savedWorkout, ...current];
      });

      setFeedback({
        type: 'success',
        message: form.id ? 'Workout updated successfully.' : 'Workout logged successfully.',
      });
      resetForm();
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to save workout.' });
    } finally {
      setSavingWorkout(false);
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
          You are authenticated, but no profile record was found. Run <code>supabase/schema.sql</code> and refresh the app.
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
            <Typography color="text.secondary" maxWidth="900px">
              Review your membership plan, keep your training notes organized, and log each workout session from one place.
            </Typography>
          </Stack>

          {feedback.message ? (
            <Alert severity={feedback.type || 'info'} sx={{ mb: 3, borderRadius: 3 }}>
              {feedback.message}
            </Alert>
          ) : null}

          {!profile.is_active ? (
            <Alert severity="warning" sx={{ mb: 3, borderRadius: 3 }}>
              Your membership is marked as inactive. You can still view your data, but ask an admin to reactivate your account.
            </Alert>
          ) : null}

          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, height: '100%', background: '#fff' }}>
                    <Stack spacing={2}>
                      <Typography color="#ff2625" fontWeight={700}>
                        Assigned plan
                      </Typography>
                      <Typography variant="h5" fontWeight={800}>
                        {profile.plan?.name || 'No plan assigned yet'}
                      </Typography>
                      <Typography color="text.secondary">
                        {profile.plan?.description || 'Ask an admin to assign a membership plan to your profile.'}
                      </Typography>
                      {profile.plan ? (
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          <Chip label={`$${Number(profile.plan.price || 0).toFixed(2)}`} />
                          <Chip label={`Every ${profile.plan.billing_cycle}`} />
                          <Chip label={`${profile.plan.duration_weeks} week cycle`} />
                        </Stack>
                      ) : null}
                    </Stack>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, height: '100%', background: '#fff' }}>
                    <Stack spacing={1.2}>
                      <Typography color="#ff2625" fontWeight={700}>
                        Profile
                      </Typography>
                      <Typography variant="body1"><strong>Email:</strong> {profile.email}</Typography>
                      <Typography variant="body1"><strong>Role:</strong> {profile.role}</Typography>
                      <Typography variant="body1"><strong>Status:</strong> {profile.is_active ? 'Active' : 'Inactive'}</Typography>
                      <Typography variant="body1"><strong>Member since:</strong> {formatDate(profile.member_since)}</Typography>
                      {profile.role === 'admin' ? (
                        <Button component={RouterLink} to="/admin" variant="outlined" sx={{ mt: 1, textTransform: 'none' }}>
                          Open Admin Panel
                        </Button>
                      ) : null}
                    </Stack>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={3}>
                  <MetricCard title="Workout logs" value={stats.totalWorkouts} caption="Total sessions stored" icon={FitnessCenter} />
                </Grid>
                <Grid item xs={12} md={3}>
                  <MetricCard title="Exercise rows" value={stats.totalEntries} caption="Entries across all workouts" icon={Checklist} />
                </Grid>
                <Grid item xs={12} md={3}>
                  <MetricCard title="Completed" value={stats.completedWorkouts} caption="Marked finished" icon={Insights} />
                </Grid>
                <Grid item xs={12} md={3}>
                  <MetricCard title="Last 7 days" value={stats.recentWorkouts} caption="Recent training sessions" icon={CalendarMonth} />
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12} lg={4}>
              <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
                <Stack spacing={1}>
                  <Typography color="#ff2625" fontWeight={700}>
                    Quick training tip
                  </Typography>
                  <Typography variant="h6" fontWeight={800}>
                    Use one workout log per session
                  </Typography>
                  <Typography color="text.secondary" lineHeight={1.8}>
                    Add one or more exercise rows under each workout so you can keep your notes, sets,
                    reps, and load together by training day.
                  </Typography>
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} lg={5}>
              <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
                <Stack spacing={1.5} mb={3}>
                  <Typography color="#ff2625" fontWeight={700}>
                    Workout tracker
                  </Typography>
                  <Typography variant="h5" fontWeight={800}>
                    {form.id ? 'Edit workout log' : 'Log a new workout'}
                  </Typography>
                  <Typography color="text.secondary">
                    Add multiple exercise entries for one session.
                  </Typography>
                </Stack>

                <Box component="form" onSubmit={handleSubmit}>
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
                        {savingWorkout ? 'Saving...' : form.id ? 'Update workout' : 'Save workout'}
                      </Button>
                      <Button
                        type="button"
                        variant="outlined"
                        onClick={resetForm}
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
                              {formatDate(workout.workout_date)} • {workout.status}
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
                                <Stack direction="row" spacing={1} flexWrap="wrap">
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
