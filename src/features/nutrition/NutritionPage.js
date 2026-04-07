import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  LocalDining,
  RestaurantMenu,
  Scale,
  WaterDrop,
} from '@mui/icons-material';

import LoadingScreen from '../../components/common/LoadingScreen';
import MetricCard from '../../components/common/MetricCard';
import SetupNotice from '../../components/common/SetupNotice';
import { useAuth } from '../../context/AuthContext';
import {
  deleteMealLog,
  deleteNutritionCheckin,
  fetchMealLogs,
  fetchNutritionAssignments,
  fetchNutritionCheckins,
  saveMealLog,
  saveNutritionCheckin,
} from '../../services/gymService';
import MealLogsCard from './components/MealLogsCard';
import NutritionCheckinsCard from './components/NutritionCheckinsCard';
import {
  buildNutritionAssignmentSummary,
  createEmptyMealLog,
  createEmptyNutritionCheckin,
  formatAssignmentDateRange,
  formatMacroTargets,
  formatNutritionDate,
  getNutritionAssignmentStatusChipSx,
  getNutritionAssignmentStatusMeta,
  normaliseMealLogForForm,
  normaliseNutritionCheckinForForm,
  sortMealLogs,
  sortNutritionAssignments,
  sortNutritionCheckins,
} from './nutritionHelpers';

const NutritionPage = () => {
  const { user, profile, loading, isConfigured } = useAuth();

  const [assignments, setAssignments] = useState([]);
  const [mealLogs, setMealLogs] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');

  const [mealForm, setMealForm] = useState(() => ({
    ...createEmptyMealLog(),
    assignment_id: '',
  }));
  const [checkinForm, setCheckinForm] = useState(() => ({
    ...createEmptyNutritionCheckin(),
    assignment_id: '',
  }));

  const [pageLoading, setPageLoading] = useState(true);
  const [pageFeedback, setPageFeedback] = useState({ type: '', message: '' });
  const [mealFeedback, setMealFeedback] = useState({ type: '', message: '' });
  const [checkinFeedback, setCheckinFeedback] = useState({ type: '', message: '' });
  const [savingMealLog, setSavingMealLog] = useState(false);
  const [savingCheckin, setSavingCheckin] = useState(false);

  const loadNutritionData = useCallback(async () => {
    if (!user || !isConfigured) {
      setPageLoading(false);
      return;
    }

    try {
      setPageLoading(true);

      const [assignmentRows, mealRows, checkinRows] = await Promise.all([
        fetchNutritionAssignments({ memberId: user.id, limit: 20 }),
        fetchMealLogs(user.id, { limit: 80 }),
        fetchNutritionCheckins(user.id, 30),
      ]);

      const nextAssignments = sortNutritionAssignments(assignmentRows);
      setAssignments(nextAssignments);
      setMealLogs(sortMealLogs(mealRows));
      setCheckins(sortNutritionCheckins(checkinRows));

      if (nextAssignments[0]?.id) {
        const preferredAssignment = nextAssignments.find((assignment) => assignment.assignment_status === 'active') || nextAssignments[0];
        setSelectedAssignmentId((current) => current || preferredAssignment.id);
        setMealForm((current) => ({
          ...current,
          assignment_id: current.assignment_id || preferredAssignment.id,
        }));
        setCheckinForm((current) => ({
          ...current,
          assignment_id: current.assignment_id || preferredAssignment.id,
        }));
      }
    } catch (error) {
      setPageFeedback({
        type: 'error',
        message: error.message || 'Unable to load your nutrition workspace.',
      });
    } finally {
      setPageLoading(false);
    }
  }, [isConfigured, user]);

  useEffect(() => {
    loadNutritionData();
  }, [loadNutritionData]);

  const selectedAssignment = useMemo(() => (
    assignments.find((assignment) => assignment.id === selectedAssignmentId)
    || assignments.find((assignment) => assignment.assignment_status === 'active')
    || assignments[0]
    || null
  ), [assignments, selectedAssignmentId]);

  const filteredMealLogs = useMemo(() => (
    selectedAssignment?.id
      ? sortMealLogs(mealLogs.filter((entry) => entry.assignment_id === selectedAssignment.id))
      : sortMealLogs(mealLogs)
  ), [mealLogs, selectedAssignment]);

  const filteredCheckins = useMemo(() => (
    selectedAssignment?.id
      ? sortNutritionCheckins(checkins.filter((entry) => entry.assignment_id === selectedAssignment.id))
      : sortNutritionCheckins(checkins)
  ), [checkins, selectedAssignment]);

  const summary = useMemo(() => (
    buildNutritionAssignmentSummary(selectedAssignment, filteredMealLogs, filteredCheckins)
  ), [filteredCheckins, filteredMealLogs, selectedAssignment]);

  const updateMealField = (field) => (event) => {
    const { value } = event.target;
    setMealForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateCheckinField = (field) => (event) => {
    const { value } = event.target;
    setCheckinForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resetMealForm = useCallback((assignmentId = selectedAssignment?.id || '') => {
    setMealForm({
      ...createEmptyMealLog(),
      assignment_id: assignmentId,
    });
  }, [selectedAssignment]);

  const resetCheckinForm = useCallback((assignmentId = selectedAssignment?.id || '') => {
    setCheckinForm({
      ...createEmptyNutritionCheckin(),
      assignment_id: assignmentId,
    });
  }, [selectedAssignment]);

  const handleSaveMealLog = async (event) => {
    event.preventDefault();
    setMealFeedback({ type: '', message: '' });

    try {
      setSavingMealLog(true);

      const payload = {
        ...mealForm,
        assignment_id: mealForm.assignment_id || selectedAssignment?.id || '',
      };

      const savedEntry = await saveMealLog(user.id, payload, {
        entrySource: 'member_app',
      });

      setMealLogs((current) => sortMealLogs([
        savedEntry,
        ...current.filter((entry) => entry.id !== savedEntry.id),
      ]));
      setMealFeedback({
        type: 'success',
        message: mealForm.id ? 'Meal log updated.' : 'Meal log saved.',
      });
      resetMealForm(payload.assignment_id);
    } catch (error) {
      setMealFeedback({
        type: 'error',
        message: error.message || 'Unable to save this meal log.',
      });
    } finally {
      setSavingMealLog(false);
    }
  };

  const handleDeleteMealLog = async (entryId) => {
    if (!window.confirm('Delete this meal log?')) {
      return;
    }

    try {
      await deleteMealLog(entryId);
      setMealLogs((current) => current.filter((entry) => entry.id !== entryId));
      setMealFeedback({
        type: 'success',
        message: 'Meal log removed.',
      });
    } catch (error) {
      setMealFeedback({
        type: 'error',
        message: error.message || 'Unable to delete this meal log.',
      });
    }
  };

  const handleSaveCheckin = async (event) => {
    event.preventDefault();
    setCheckinFeedback({ type: '', message: '' });

    try {
      setSavingCheckin(true);

      const payload = {
        ...checkinForm,
        assignment_id: checkinForm.assignment_id || selectedAssignment?.id || '',
      };

      const savedEntry = await saveNutritionCheckin(user.id, payload, {
        entrySource: 'member_app',
      });

      setCheckins((current) => sortNutritionCheckins([
        savedEntry,
        ...current.filter((entry) => entry.id !== savedEntry.id),
      ]));
      setCheckinFeedback({
        type: 'success',
        message: checkinForm.id ? 'Nutrition check-in updated.' : 'Nutrition check-in saved.',
      });
      resetCheckinForm(payload.assignment_id);
    } catch (error) {
      setCheckinFeedback({
        type: 'error',
        message: error.message || 'Unable to save this check-in.',
      });
    } finally {
      setSavingCheckin(false);
    }
  };

  const handleDeleteCheckin = async (entryId) => {
    if (!window.confirm('Delete this nutrition check-in?')) {
      return;
    }

    try {
      await deleteNutritionCheckin(entryId);
      setCheckins((current) => current.filter((entry) => entry.id !== entryId));
      setCheckinFeedback({
        type: 'success',
        message: 'Nutrition check-in removed.',
      });
    } catch (error) {
      setCheckinFeedback({
        type: 'error',
        message: error.message || 'Unable to delete this check-in.',
      });
    }
  };

  if (loading || pageLoading) {
    return <LoadingScreen message="Loading your nutrition plan..." />;
  }

  const statusMeta = getNutritionAssignmentStatusMeta(selectedAssignment?.assignment_status);

  return (
    <Box sx={{ py: { xs: 3, md: 5 } }}>
      <SetupNotice title="Nutrition planning needs Supabase setup" />

      <Stack spacing={1.5} mb={4}>
        <Typography color="#ff2625" fontWeight={700}>
          Member nutrition hub
        </Typography>
        <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '32px', md: '46px' } }}>
          Fuel your training with a real plan
        </Typography>
        <Typography color="text.secondary" maxWidth="920px">
          Review your assigned meal strategy, log meals and hydration, and keep weekly nutrition check-ins in one place.
        </Typography>
      </Stack>

      {pageFeedback.message ? (
        <Alert severity={pageFeedback.type || 'info'} sx={{ mb: 3, borderRadius: 3 }}>
          {pageFeedback.message}
        </Alert>
      ) : null}

      {!assignments.length ? (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 3 }}>
          No nutrition plan has been assigned to your account yet. A coach can create a plan for you from the staff nutrition workspace.
        </Alert>
      ) : null}

      <Grid container spacing={3} mb={1}>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Plan days"
            value={summary.activeDayCount || 0}
            caption="Daily plan blocks assigned"
            icon={RestaurantMenu}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Meals this week"
            value={summary.logsThisWeekCount || 0}
            caption={`${summary.logsTodayCount || 0} logged today`}
            icon={LocalDining}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Average adherence"
            value={summary.averageAdherence ? summary.averageAdherence.toFixed(1) : '—'}
            caption="Based on recent meal logs"
            icon={Scale}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Logged water"
            value={summary.macroTotals?.water_liters ? `${Number(summary.macroTotals.water_liters).toFixed(1)}L` : '—'}
            caption="Across recent meal logs"
            icon={WaterDrop}
          />
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
            <Stack spacing={2.5}>
              <Stack spacing={0.75}>
                <Typography color="#ff2625" fontWeight={700}>
                  Current assignment
                </Typography>
                <Typography variant="h5" fontWeight={800}>
                  {selectedAssignment?.template?.name || 'No assigned plan'}
                </Typography>
                <Typography color="text.secondary">
                  {selectedAssignment?.template?.goal || selectedAssignment?.goal_note || 'Your coach can attach a plan with calorie and macro targets here.'}
                </Typography>
              </Stack>

              {assignments.length > 1 ? (
                <TextField
                  select
                  label="Choose an assignment"
                  value={selectedAssignmentId || selectedAssignment?.id || ''}
                  onChange={(event) => {
                    const nextAssignmentId = event.target.value;
                    setSelectedAssignmentId(nextAssignmentId);
                    setMealForm((current) => ({ ...current, assignment_id: nextAssignmentId }));
                    setCheckinForm((current) => ({ ...current, assignment_id: nextAssignmentId }));
                  }}
                  fullWidth
                >
                  {assignments.map((assignment) => (
                    <MenuItem key={assignment.id} value={assignment.id}>
                      {assignment.template?.name || 'Nutrition plan'} • {getNutritionAssignmentStatusMeta(assignment.assignment_status).label}
                    </MenuItem>
                  ))}
                </TextField>
              ) : null}

              {selectedAssignment ? (
                <>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip
                      label={statusMeta.label}
                      sx={getNutritionAssignmentStatusChipSx(selectedAssignment.assignment_status)}
                    />
                    <Chip label={`${summary.activeDayCount || 0} day blocks`} />
                    {summary.lastCheckin ? (
                      <Chip label={`Last check-in ${formatNutritionDate(summary.lastCheckin.checked_in_on)}`} />
                    ) : null}
                  </Stack>

                  <Divider />

                  <Stack spacing={1.2}>
                    <Typography variant="body1">
                      <strong>Schedule:</strong> {formatAssignmentDateRange(selectedAssignment.start_date, selectedAssignment.end_date)}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Targets:</strong> {formatMacroTargets(summary.targets)}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Coach notes:</strong> {selectedAssignment.coach_notes || 'No additional coach notes yet.'}
                    </Typography>
                    {profile?.fitness_goal ? (
                      <Typography variant="body1">
                        <strong>Fitness goal:</strong> {profile.fitness_goal}
                      </Typography>
                    ) : null}
                  </Stack>
                </>
              ) : null}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
            <Stack spacing={2.5}>
              <Box>
                <Typography color="#ff2625" fontWeight={700}>
                  Daily plan guidance
                </Typography>
                <Typography variant="h5" fontWeight={800} mt={0.5}>
                  {selectedAssignment?.template?.days?.length ? 'Your structured day-by-day targets' : 'No daily breakdown yet'}
                </Typography>
                <Typography color="text.secondary" mt={0.75}>
                  Review your macro targets, hydration goals, and meal guidance before logging meals.
                </Typography>
              </Box>

              {!selectedAssignment?.template?.days?.length ? (
                <Alert severity="info" sx={{ borderRadius: 3 }}>
                  Your current plan does not include day-by-day nutrition guidance yet.
                </Alert>
              ) : (
                <Grid container spacing={2}>
                  {selectedAssignment.template.days.map((day) => (
                    <Grid item xs={12} md={6} key={day.id || day.client_id || day.day_index}>
                      <Paper variant="outlined" sx={{ p: 2.25, borderRadius: 3, height: '100%' }}>
                        <Stack spacing={1.25}>
                          <Typography variant="h6" fontWeight={800}>
                            {day.title || `Day ${day.day_index}`}
                          </Typography>
                          <Typography color="text.secondary">
                            {formatMacroTargets({
                              calories: day.calorie_target,
                              protein_g: day.protein_target_g,
                              carbs_g: day.carbs_target_g,
                              fat_g: day.fat_target_g,
                              fiber_g: day.fiber_target_g,
                              hydration_liters: day.hydration_target_liters,
                            })}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {day.meal_guidance || 'No extra guidance was added for this day.'}
                          </Typography>
                        </Stack>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={7}>
          <MealLogsCard
            logs={filteredMealLogs}
            form={mealForm}
            feedback={mealFeedback}
            saving={savingMealLog}
            disableActions={!profile?.is_active}
            onFieldChange={updateMealField}
            onSubmit={handleSaveMealLog}
            onCancelEdit={() => resetMealForm()}
            onEdit={(entry) => setMealForm(normaliseMealLogForForm(entry))}
            onDelete={handleDeleteMealLog}
          />
        </Grid>

        <Grid item xs={12} lg={5}>
          <NutritionCheckinsCard
            entries={filteredCheckins}
            form={checkinForm}
            feedback={checkinFeedback}
            saving={savingCheckin}
            disableActions={!profile?.is_active}
            allowCoachFeedback={false}
            onFieldChange={updateCheckinField}
            onSubmit={handleSaveCheckin}
            onCancelEdit={() => resetCheckinForm()}
            onEdit={(entry) => setCheckinForm(normaliseNutritionCheckinForForm(entry))}
            onDelete={handleDeleteCheckin}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default NutritionPage;
