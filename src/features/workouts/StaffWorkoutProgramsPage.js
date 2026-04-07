import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add,
  AutoAwesome,
  DeleteOutline,
  EditOutlined,
  FitnessCenter,
  LibraryBooks,
  PersonAddAlt1,
} from '@mui/icons-material';

import LoadingScreen from '../../components/common/LoadingScreen';
import MetricCard from '../../components/common/MetricCard';
import SetupNotice from '../../components/common/SetupNotice';
import { useAuth } from '../../context/AuthContext';
import {
  fetchExerciseLibrary,
  fetchMembers,
  fetchWorkoutAssignments,
  fetchWorkoutPrograms,
  saveExerciseLibraryItem,
  saveWorkoutAssignment,
  saveWorkoutProgram,
} from '../../services/gymService';
import {
  buildWorkoutProgrammingStats,
  createEmptyAssignment,
  createEmptyExerciseLibraryForm,
  createEmptyProgram,
  createEmptyProgramDay,
  createEmptyProgramExercise,
  EXERCISE_DIFFICULTY_OPTIONS,
  formatProgramDateRange,
  getExerciseDifficultyChipSx,
  getExerciseDifficultyMeta,
  getWorkoutAssignmentStatusChipSx,
  getWorkoutAssignmentStatusMeta,
  getWorkoutProgramStatusChipSx,
  getWorkoutProgramStatusMeta,
  normaliseAssignmentForForm,
  normaliseExerciseLibraryForm,
  normaliseProgramForForm,
  sortWorkoutAssignments,
  sortWorkoutPrograms,
  WORKOUT_ASSIGNMENT_STATUS_OPTIONS,
  WORKOUT_PROGRAM_STATUS_OPTIONS,
} from './workoutProgrammingHelpers';

const WORKOUT_DIFFICULTY_OPTIONS = EXERCISE_DIFFICULTY_OPTIONS;

const StaffWorkoutProgramsPage = () => {
  const { loading, profile, isConfigured } = useAuth();

  const [tab, setTab] = useState('programs');
  const [pageLoading, setPageLoading] = useState(true);
  const [savingProgram, setSavingProgram] = useState(false);
  const [savingLibrary, setSavingLibrary] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const [libraryItems, setLibraryItems] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [members, setMembers] = useState([]);

  const [libraryForm, setLibraryForm] = useState(createEmptyExerciseLibraryForm);
  const [programForm, setProgramForm] = useState(createEmptyProgram);
  const [assignmentForm, setAssignmentForm] = useState(createEmptyAssignment);

  const loadProgrammingWorkspace = useCallback(async () => {
    if (!isConfigured) {
      setPageLoading(false);
      return;
    }

    try {
      setPageLoading(true);
      const [libraryRows, programRows, assignmentRows, memberRows] = await Promise.all([
        fetchExerciseLibrary(),
        fetchWorkoutPrograms({ includeArchived: true }),
        fetchWorkoutAssignments({ limit: 80 }),
        fetchMembers(),
      ]);

      setLibraryItems(libraryRows);
      setPrograms(sortWorkoutPrograms(programRows));
      setAssignments(sortWorkoutAssignments(assignmentRows));
      setMembers(memberRows.filter((member) => member.role === 'member'));
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to load the workout programming workspace.',
      });
    } finally {
      setPageLoading(false);
    }
  }, [isConfigured]);

  useEffect(() => {
    loadProgrammingWorkspace();
  }, [loadProgrammingWorkspace]);

  const stats = useMemo(() => buildWorkoutProgrammingStats({
    programs,
    assignments,
    libraryItems,
  }), [assignments, libraryItems, programs]);

  const activeProgramOptions = useMemo(() => (
    programs.filter((program) => program.status !== 'archived')
  ), [programs]);

  const updateLibraryField = (field) => (event) => {
    const value = field === 'is_active' ? event.target.checked : event.target.value;
    setLibraryForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateProgramField = (field) => (event) => {
    setProgramForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const updateAssignmentField = (field) => (event) => {
    setAssignmentForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const resetLibraryForm = () => setLibraryForm(createEmptyExerciseLibraryForm());
  const resetProgramForm = () => setProgramForm(createEmptyProgram());
  const resetAssignmentForm = () => setAssignmentForm(createEmptyAssignment());

  const addProgramDay = () => {
    setProgramForm((current) => ({
      ...current,
      days: [...current.days, createEmptyProgramDay(current.days.length + 1)],
    }));
  };

  const removeProgramDay = (clientId) => {
    setProgramForm((current) => {
      const nextDays = current.days.filter((day) => day.client_id !== clientId)
        .map((day, index) => ({
          ...day,
          day_index: index + 1,
        }));

      return {
        ...current,
        days: nextDays.length ? nextDays : [createEmptyProgramDay(1)],
      };
    });
  };

  const updateProgramDayField = (clientId, field) => (event) => {
    const { value } = event.target;

    setProgramForm((current) => ({
      ...current,
      days: current.days.map((day) => (
        day.client_id === clientId
          ? { ...day, [field]: value }
          : day
      )),
    }));
  };

  const addProgramExercise = (dayClientId) => {
    setProgramForm((current) => ({
      ...current,
      days: current.days.map((day) => (
        day.client_id === dayClientId
          ? { ...day, exercises: [...day.exercises, createEmptyProgramExercise()] }
          : day
      )),
    }));
  };

  const removeProgramExercise = (dayClientId, exerciseClientId) => {
    setProgramForm((current) => ({
      ...current,
      days: current.days.map((day) => {
        if (day.client_id !== dayClientId) {
          return day;
        }

        const nextExercises = day.exercises.filter((exercise) => exercise.client_id !== exerciseClientId);
        return {
          ...day,
          exercises: nextExercises.length ? nextExercises : [createEmptyProgramExercise()],
        };
      }),
    }));
  };

  const updateProgramExerciseField = (dayClientId, exerciseClientId, field) => (event) => {
    const value = field === 'is_optional' ? event.target.checked : event.target.value;

    setProgramForm((current) => ({
      ...current,
      days: current.days.map((day) => {
        if (day.client_id !== dayClientId) {
          return day;
        }

        return {
          ...day,
          exercises: day.exercises.map((exercise) => {
            if (exercise.client_id !== exerciseClientId) {
              return exercise;
            }

            const nextExercise = {
              ...exercise,
              [field]: value,
            };

            if (field === 'exercise_library_id') {
              const selectedExercise = libraryItems.find((item) => item.id === value);

              if (selectedExercise) {
                nextExercise.exercise_name = selectedExercise.name;
              }
            }

            return nextExercise;
          }),
        };
      }),
    }));
  };

  const handleSaveLibraryItem = async (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });

    try {
      setSavingLibrary(true);
      const savedItem = await saveExerciseLibraryItem(libraryForm);

      setLibraryItems((current) => {
        const nextItems = current.some((item) => item.id === savedItem.id)
          ? current.map((item) => (item.id === savedItem.id ? savedItem : item))
          : [savedItem, ...current];

        return [...nextItems].sort((left, right) => String(left.name || '').localeCompare(String(right.name || '')));
      });

      setFeedback({
        type: 'success',
        message: libraryForm.id ? 'Exercise library item updated.' : 'Exercise added to the library.',
      });
      resetLibraryForm();
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to save this exercise.',
      });
    } finally {
      setSavingLibrary(false);
    }
  };

  const handleSaveProgram = async (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });

    try {
      setSavingProgram(true);
      const savedProgram = await saveWorkoutProgram(programForm, profile?.id);

      setPrograms((current) => sortWorkoutPrograms([
        savedProgram,
        ...current.filter((program) => program.id !== savedProgram.id),
      ]));

      setFeedback({
        type: 'success',
        message: programForm.id ? 'Workout program updated.' : 'Workout program created.',
      });
      setProgramForm(normaliseProgramForForm(savedProgram));
      setTab('programs');
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to save the workout program.',
      });
    } finally {
      setSavingProgram(false);
    }
  };

  const handleSaveAssignment = async (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });

    try {
      setSavingAssignment(true);
      const savedAssignment = await saveWorkoutAssignment(assignmentForm, profile?.id);

      setAssignments((current) => sortWorkoutAssignments([
        savedAssignment,
        ...current.filter((assignment) => assignment.id !== savedAssignment.id),
      ]));

      setFeedback({
        type: 'success',
        message: assignmentForm.id ? 'Workout assignment updated.' : 'Workout plan assigned to member.',
      });
      setAssignmentForm(normaliseAssignmentForForm(savedAssignment));
      setTab('assignments');
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to save the assignment.',
      });
    } finally {
      setSavingAssignment(false);
    }
  };

  if (loading || pageLoading) {
    return <LoadingScreen message="Loading workout programming tools..." />;
  }

  return (
    <Box sx={{ py: { xs: 3, md: 5 } }}>
      <SetupNotice title="Workout programming needs Supabase setup" />

      <Stack spacing={1.5} mb={4}>
        <Typography color="#ff2625" fontWeight={700}>
          Staff workout programming
        </Typography>
        <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '32px', md: '44px' } }}>
          Build templates, assign plans, and manage exercise prescriptions
        </Typography>
        <Typography color="text.secondary" maxWidth="980px">
          Trainers and staff can maintain the shared exercise library, create reusable workout templates, and assign structured plans to members from one workspace.
        </Typography>
      </Stack>

      {feedback.message ? (
        <Alert severity={feedback.type || 'info'} sx={{ mb: 3, borderRadius: 3 }}>
          {feedback.message}
        </Alert>
      ) : null}

      <Grid container spacing={3} mb={1}>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Active templates"
            value={stats.activePrograms}
            caption={`${stats.programTemplates} total programs`}
            icon={AutoAwesome}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Exercise library"
            value={stats.libraryCount}
            caption="Movements available for programming"
            icon={LibraryBooks}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Active assignments"
            value={stats.activeAssignments}
            caption={`${stats.assignedMembers} members with a live plan`}
            icon={PersonAddAlt1}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Members"
            value={members.length}
            caption="Eligible member profiles in roster"
            icon={FitnessCenter}
          />
        </Grid>
      </Grid>

      <Paper className="surface-card" sx={{ p: 1.5, borderRadius: 4, background: '#fff' }}>
        <Tabs
          value={tab}
          onChange={(_event, nextValue) => setTab(nextValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Programs" value="programs" />
          <Tab label="Exercise library" value="library" />
          <Tab label="Assignments" value="assignments" />
        </Tabs>
      </Paper>

      {tab === 'programs' ? (
        <Grid container spacing={3} mt={0.5}>
          <Grid item xs={12} lg={7}>
            <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
              <Stack spacing={1.5} mb={3}>
                <Typography color="#ff2625" fontWeight={700}>
                  Program builder
                </Typography>
                <Typography variant="h5" fontWeight={800}>
                  {programForm.id ? 'Edit workout template' : 'Create a new workout template'}
                </Typography>
                <Typography color="text.secondary">
                  Build multi-day workout plans with exact exercise prescriptions, tempo cues, and coaching notes.
                </Typography>
              </Stack>

              <Box component="form" onSubmit={handleSaveProgram}>
                <Stack spacing={2.5}>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <TextField
                      label="Program name"
                      value={programForm.name}
                      onChange={updateProgramField('name')}
                      fullWidth
                      required
                    />
                    <TextField
                      label="Goal"
                      value={programForm.goal}
                      onChange={updateProgramField('goal')}
                      fullWidth
                    />
                  </Stack>

                  <TextField
                    label="Description"
                    value={programForm.description}
                    onChange={updateProgramField('description')}
                    multiline
                    minRows={3}
                    fullWidth
                  />

                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <TextField
                      select
                      label="Difficulty"
                      value={programForm.difficulty}
                      onChange={updateProgramField('difficulty')}
                      fullWidth
                    >
                      {WORKOUT_DIFFICULTY_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="Duration (weeks)"
                      type="number"
                      value={programForm.duration_weeks}
                      onChange={updateProgramField('duration_weeks')}
                      fullWidth
                    />
                    <TextField
                      label="Sessions / week"
                      type="number"
                      value={programForm.sessions_per_week}
                      onChange={updateProgramField('sessions_per_week')}
                      fullWidth
                    />
                    <TextField
                      select
                      label="Status"
                      value={programForm.status}
                      onChange={updateProgramField('status')}
                      fullWidth
                    >
                      {WORKOUT_PROGRAM_STATUS_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>

                  <Divider />

                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6" fontWeight={800}>
                      Program days
                    </Typography>
                    <Button
                      startIcon={<Add />}
                      onClick={addProgramDay}
                      sx={{ textTransform: 'none' }}
                    >
                      Add day
                    </Button>
                  </Stack>

                  <Stack spacing={3}>
                    {programForm.days.map((day, dayIndex) => (
                      <Paper key={day.client_id} variant="outlined" sx={{ p: 2.5, borderRadius: 3, boxShadow: 'none' }}>
                        <Stack spacing={2.5}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="h6" fontWeight={800}>
                              Day {dayIndex + 1}
                            </Typography>
                            <IconButton
                              color="error"
                              size="small"
                              onClick={() => removeProgramDay(day.client_id)}
                              disabled={programForm.days.length === 1}
                            >
                              <DeleteOutline fontSize="small" />
                            </IconButton>
                          </Stack>

                          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                            <TextField
                              label="Day title"
                              value={day.title}
                              onChange={updateProgramDayField(day.client_id, 'title')}
                              fullWidth
                              required
                            />
                            <TextField
                              label="Focus area"
                              value={day.focus_area}
                              onChange={updateProgramDayField(day.client_id, 'focus_area')}
                              fullWidth
                            />
                            <TextField
                              label="Target duration (min)"
                              type="number"
                              value={day.target_duration_minutes}
                              onChange={updateProgramDayField(day.client_id, 'target_duration_minutes')}
                              fullWidth
                            />
                          </Stack>

                          <TextField
                            label="Coach notes for the day"
                            value={day.notes}
                            onChange={updateProgramDayField(day.client_id, 'notes')}
                            multiline
                            minRows={2}
                            fullWidth
                          />

                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography fontWeight={800}>
                              Exercise prescriptions
                            </Typography>
                            <Button
                              startIcon={<Add />}
                              onClick={() => addProgramExercise(day.client_id)}
                              sx={{ textTransform: 'none' }}
                            >
                              Add exercise
                            </Button>
                          </Stack>

                          <Stack spacing={2}>
                            {day.exercises.map((exercise, exerciseIndex) => (
                              <Paper
                                key={exercise.client_id}
                                variant="outlined"
                                sx={{ p: 2, borderRadius: 3, boxShadow: 'none' }}
                              >
                                <Stack spacing={2}>
                                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography fontWeight={700}>
                                      Exercise {exerciseIndex + 1}
                                    </Typography>
                                    <IconButton
                                      color="error"
                                      size="small"
                                      onClick={() => removeProgramExercise(day.client_id, exercise.client_id)}
                                      disabled={day.exercises.length === 1}
                                    >
                                      <DeleteOutline fontSize="small" />
                                    </IconButton>
                                  </Stack>

                                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                                    <TextField
                                      select
                                      label="Library exercise"
                                      value={exercise.exercise_library_id}
                                      onChange={updateProgramExerciseField(day.client_id, exercise.client_id, 'exercise_library_id')}
                                      fullWidth
                                    >
                                      <MenuItem value="">Custom exercise</MenuItem>
                                      {libraryItems.map((item) => (
                                        <MenuItem key={item.id} value={item.id}>
                                          {item.name}
                                        </MenuItem>
                                      ))}
                                    </TextField>
                                    <TextField
                                      label="Exercise name"
                                      value={exercise.exercise_name}
                                      onChange={updateProgramExerciseField(day.client_id, exercise.client_id, 'exercise_name')}
                                      fullWidth
                                      required
                                    />
                                  </Stack>

                                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                                    <TextField
                                      label="Sets"
                                      type="number"
                                      value={exercise.prescribed_sets}
                                      onChange={updateProgramExerciseField(day.client_id, exercise.client_id, 'prescribed_sets')}
                                      fullWidth
                                    />
                                    <TextField
                                      label="Reps"
                                      value={exercise.prescribed_reps}
                                      onChange={updateProgramExerciseField(day.client_id, exercise.client_id, 'prescribed_reps')}
                                      fullWidth
                                    />
                                    <TextField
                                      label="Weight / load cue"
                                      value={exercise.prescribed_weight}
                                      onChange={updateProgramExerciseField(day.client_id, exercise.client_id, 'prescribed_weight')}
                                      fullWidth
                                    />
                                  </Stack>

                                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                                    <TextField
                                      label="Rest (seconds)"
                                      type="number"
                                      value={exercise.rest_seconds}
                                      onChange={updateProgramExerciseField(day.client_id, exercise.client_id, 'rest_seconds')}
                                      fullWidth
                                    />
                                    <TextField
                                      label="Tempo"
                                      value={exercise.tempo}
                                      onChange={updateProgramExerciseField(day.client_id, exercise.client_id, 'tempo')}
                                      fullWidth
                                    />
                                  </Stack>

                                  <TextField
                                    label="Trainer notes"
                                    value={exercise.trainer_notes}
                                    onChange={updateProgramExerciseField(day.client_id, exercise.client_id, 'trainer_notes')}
                                    multiline
                                    minRows={2}
                                    fullWidth
                                  />

                                  <FormControlLabel
                                    control={(
                                      <Switch
                                        checked={Boolean(exercise.is_optional)}
                                        onChange={updateProgramExerciseField(day.client_id, exercise.client_id, 'is_optional')}
                                      />
                                    )}
                                    label="Mark as optional / bonus work"
                                  />
                                </Stack>
                              </Paper>
                            ))}
                          </Stack>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={savingProgram}
                      sx={{ bgcolor: '#ff2625', borderRadius: 999, textTransform: 'none', '&:hover': { bgcolor: '#df1d1d' } }}
                    >
                      {savingProgram ? 'Saving template...' : 'Save workout template'}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={resetProgramForm}
                      sx={{ borderRadius: 999, textTransform: 'none' }}
                    >
                      New blank template
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={5}>
            <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
              <Stack spacing={2.5}>
                <Stack spacing={0.5}>
                  <Typography color="#ff2625" fontWeight={700}>
                    Existing templates
                  </Typography>
                  <Typography variant="h6" fontWeight={800}>
                    Reusable programs for coaches
                  </Typography>
                </Stack>

                {!programs.length ? (
                  <Typography color="text.secondary">
                    No workout templates yet. Build your first program on the left.
                  </Typography>
                ) : (
                  programs.map((program) => (
                    <Paper key={program.id} variant="outlined" sx={{ p: 2.25, borderRadius: 3, boxShadow: 'none' }}>
                      <Stack spacing={1.5}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                          <Box>
                            <Typography fontWeight={800}>
                              {program.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {program.goal || 'No goal added'}
                            </Typography>
                          </Box>
                          <IconButton size="small" onClick={() => setProgramForm(normaliseProgramForForm(program))}>
                            <EditOutlined fontSize="small" />
                          </IconButton>
                        </Stack>

                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Chip
                            label={getWorkoutProgramStatusMeta(program.status).label}
                            sx={getWorkoutProgramStatusChipSx(program.status)}
                          />
                          <Chip
                            label={getExerciseDifficultyMeta(program.difficulty).label}
                            sx={getExerciseDifficultyChipSx(program.difficulty)}
                          />
                          <Chip label={`${program.days?.length || 0} day${program.days?.length === 1 ? '' : 's'}`} />
                        </Stack>

                        <Typography variant="body2" color="text.secondary">
                          {program.description || 'No additional description'}
                        </Typography>
                      </Stack>
                    </Paper>
                  ))
                )}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      ) : null}

      {tab === 'library' ? (
        <Grid container spacing={3} mt={0.5}>
          <Grid item xs={12} lg={5}>
            <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
              <Stack spacing={1.5} mb={3}>
                <Typography color="#ff2625" fontWeight={700}>
                  Exercise library
                </Typography>
                <Typography variant="h5" fontWeight={800}>
                  {libraryForm.id ? 'Edit library movement' : 'Add a movement'}
                </Typography>
                <Typography color="text.secondary">
                  Maintain the reusable exercise catalogue trainers can pull into templates.
                </Typography>
              </Stack>

              <Box component="form" onSubmit={handleSaveLibraryItem}>
                <Stack spacing={2.5}>
                  <TextField
                    label="Exercise name"
                    value={libraryForm.name}
                    onChange={updateLibraryField('name')}
                    fullWidth
                    required
                  />
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <TextField
                      label="Muscle group"
                      value={libraryForm.muscle_group}
                      onChange={updateLibraryField('muscle_group')}
                      fullWidth
                    />
                    <TextField
                      label="Equipment"
                      value={libraryForm.equipment}
                      onChange={updateLibraryField('equipment')}
                      fullWidth
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <TextField
                      label="Movement pattern"
                      value={libraryForm.movement_pattern}
                      onChange={updateLibraryField('movement_pattern')}
                      fullWidth
                    />
                    <TextField
                      select
                      label="Difficulty"
                      value={libraryForm.difficulty}
                      onChange={updateLibraryField('difficulty')}
                      fullWidth
                    >
                      {EXERCISE_DIFFICULTY_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>
                  <TextField
                    label="Instructions"
                    value={libraryForm.instructions}
                    onChange={updateLibraryField('instructions')}
                    multiline
                    minRows={3}
                    fullWidth
                  />
                  <TextField
                    label="Video URL"
                    value={libraryForm.video_url}
                    onChange={updateLibraryField('video_url')}
                    fullWidth
                  />
                  <FormControlLabel
                    control={(
                      <Switch
                        checked={Boolean(libraryForm.is_active)}
                        onChange={updateLibraryField('is_active')}
                      />
                    )}
                    label="Available for active programming"
                  />

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={savingLibrary}
                      sx={{ bgcolor: '#ff2625', borderRadius: 999, textTransform: 'none', '&:hover': { bgcolor: '#df1d1d' } }}
                    >
                      {savingLibrary ? 'Saving exercise...' : 'Save exercise'}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={resetLibraryForm}
                      sx={{ borderRadius: 999, textTransform: 'none' }}
                    >
                      New exercise
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={7}>
            <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
              <Stack spacing={2.5}>
                <Stack spacing={0.5}>
                  <Typography color="#ff2625" fontWeight={700}>
                    Library catalogue
                  </Typography>
                  <Typography variant="h6" fontWeight={800}>
                    Reusable movements
                  </Typography>
                </Stack>

                {!libraryItems.length ? (
                  <Typography color="text.secondary">
                    No exercises in the library yet. Add your first movement on the left.
                  </Typography>
                ) : (
                  libraryItems.map((item) => (
                    <Paper key={item.id} variant="outlined" sx={{ p: 2.25, borderRadius: 3, boxShadow: 'none' }}>
                      <Stack spacing={1.25}>
                        <Stack direction="row" justifyContent="space-between" spacing={2}>
                          <Box>
                            <Typography fontWeight={800}>
                              {item.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {[item.muscle_group, item.equipment, item.movement_pattern].filter(Boolean).join(' • ') || 'No metadata yet'}
                            </Typography>
                          </Box>

                          <IconButton size="small" onClick={() => setLibraryForm(normaliseExerciseLibraryForm(item))}>
                            <EditOutlined fontSize="small" />
                          </IconButton>
                        </Stack>

                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Chip
                            label={getExerciseDifficultyMeta(item.difficulty).label}
                            sx={getExerciseDifficultyChipSx(item.difficulty)}
                          />
                          <Chip
                            label={item.is_active ? 'Active' : 'Hidden'}
                            sx={{
                              bgcolor: item.is_active ? '#ecfdf3' : '#f8fafc',
                              color: item.is_active ? '#047857' : '#475569',
                              fontWeight: 700,
                            }}
                          />
                        </Stack>

                        <Typography variant="body2" color="text.secondary">
                          {item.instructions || 'No setup instructions added yet.'}
                        </Typography>
                      </Stack>
                    </Paper>
                  ))
                )}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      ) : null}

      {tab === 'assignments' ? (
        <Grid container spacing={3} mt={0.5}>
          <Grid item xs={12} lg={5}>
            <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
              <Stack spacing={1.5} mb={3}>
                <Typography color="#ff2625" fontWeight={700}>
                  Assignment desk
                </Typography>
                <Typography variant="h5" fontWeight={800}>
                  {assignmentForm.id ? 'Update member assignment' : 'Assign a plan to a member'}
                </Typography>
                <Typography color="text.secondary">
                  Pick a program template, set the schedule window, and add a focus note for the member.
                </Typography>
              </Stack>

              <Box component="form" onSubmit={handleSaveAssignment}>
                <Stack spacing={2.5}>
                  <TextField
                    select
                    label="Member"
                    value={assignmentForm.member_id}
                    onChange={updateAssignmentField('member_id')}
                    fullWidth
                    required
                  >
                    {members.map((member) => (
                      <MenuItem key={member.id} value={member.id}>
                        {member.full_name || member.email}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    label="Program"
                    value={assignmentForm.program_id}
                    onChange={updateAssignmentField('program_id')}
                    fullWidth
                    required
                  >
                    {activeProgramOptions.map((program) => (
                      <MenuItem key={program.id} value={program.id}>
                        {program.name}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    label="Assignment status"
                    value={assignmentForm.assignment_status}
                    onChange={updateAssignmentField('assignment_status')}
                    fullWidth
                  >
                    {WORKOUT_ASSIGNMENT_STATUS_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <TextField
                      label="Start date"
                      type="date"
                      value={assignmentForm.start_date}
                      onChange={updateAssignmentField('start_date')}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                    />
                    <TextField
                      label="End date"
                      type="date"
                      value={assignmentForm.end_date}
                      onChange={updateAssignmentField('end_date')}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                    />
                  </Stack>

                  <TextField
                    label="Focus goal"
                    value={assignmentForm.focus_goal}
                    onChange={updateAssignmentField('focus_goal')}
                    fullWidth
                  />

                  <TextField
                    label="Assignment notes"
                    value={assignmentForm.notes}
                    onChange={updateAssignmentField('notes')}
                    multiline
                    minRows={3}
                    fullWidth
                  />

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={savingAssignment}
                      sx={{ bgcolor: '#ff2625', borderRadius: 999, textTransform: 'none', '&:hover': { bgcolor: '#df1d1d' } }}
                    >
                      {savingAssignment ? 'Saving assignment...' : 'Save assignment'}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={resetAssignmentForm}
                      sx={{ borderRadius: 999, textTransform: 'none' }}
                    >
                      New assignment
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={7}>
            <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
              <Stack spacing={2.5}>
                <Stack spacing={0.5}>
                  <Typography color="#ff2625" fontWeight={700}>
                    Active and historical assignments
                  </Typography>
                  <Typography variant="h6" fontWeight={800}>
                    Member programming roster
                  </Typography>
                </Stack>

                {!assignments.length ? (
                  <Typography color="text.secondary">
                    No assignments yet. Choose a member and program on the left to create the first one.
                  </Typography>
                ) : (
                  assignments.map((assignment) => (
                    <Paper key={assignment.id} variant="outlined" sx={{ p: 2.25, borderRadius: 3, boxShadow: 'none' }}>
                      <Stack spacing={1.25}>
                        <Stack direction="row" justifyContent="space-between" spacing={2}>
                          <Box>
                            <Typography fontWeight={800}>
                              {assignment.member?.full_name || assignment.member?.email || 'Member'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {assignment.program?.name || 'Workout program'}
                            </Typography>
                          </Box>

                          <IconButton size="small" onClick={() => setAssignmentForm(normaliseAssignmentForForm(assignment))}>
                            <EditOutlined fontSize="small" />
                          </IconButton>
                        </Stack>

                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Chip
                            label={getWorkoutAssignmentStatusMeta(assignment.assignment_status).label}
                            sx={getWorkoutAssignmentStatusChipSx(assignment.assignment_status)}
                          />
                          {assignment.program?.status ? (
                            <Chip
                              label={getWorkoutProgramStatusMeta(assignment.program.status).label}
                              sx={getWorkoutProgramStatusChipSx(assignment.program.status)}
                            />
                          ) : null}
                        </Stack>

                        <Typography variant="body2" color="text.secondary">
                          {formatProgramDateRange(assignment.start_date, assignment.end_date)}
                        </Typography>

                        {assignment.focus_goal || assignment.notes ? (
                          <Typography variant="body2" color="text.secondary">
                            {assignment.focus_goal || assignment.notes}
                          </Typography>
                        ) : null}
                      </Stack>
                    </Paper>
                  ))
                )}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      ) : null}
    </Box>
  );
};

export default StaffWorkoutProgramsPage;
