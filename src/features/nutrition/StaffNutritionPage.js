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
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add,
  DeleteOutline,
  EditOutlined,
  FitnessCenter,
  RestaurantMenu,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

import { PATHS } from '../../app/paths';
import LoadingScreen from '../../components/common/LoadingScreen';
import MetricCard from '../../components/common/MetricCard';
import SetupNotice from '../../components/common/SetupNotice';
import { useAuth } from '../../context/AuthContext';
import {
  deleteMealLog,
  deleteNutritionCheckin,
  fetchMealLogs,
  fetchMembers,
  fetchNutritionAssignments,
  fetchNutritionCheckins,
  fetchNutritionTemplates,
  saveMealLog,
  saveNutritionAssignment,
  saveNutritionCheckin,
  saveNutritionTemplate,
} from '../../services/gymService';
import MealLogsCard from './components/MealLogsCard';
import NutritionCheckinsCard from './components/NutritionCheckinsCard';
import {
  buildNutritionAssignmentSummary,
  createEmptyMealLog,
  createEmptyNutritionAssignment,
  createEmptyNutritionCheckin,
  createEmptyNutritionTemplate,
  createEmptyNutritionTemplateDay,
  formatAssignmentDateRange,
  formatMacroTargets,
  getNutritionAssignmentStatusChipSx,
  getNutritionAssignmentStatusMeta,
  getNutritionTemplateStatusChipSx,
  getNutritionTemplateStatusMeta,
  normaliseMealLogForForm,
  normaliseNutritionAssignmentForForm,
  normaliseNutritionCheckinForForm,
  normaliseNutritionTemplateForForm,
  NUTRITION_ASSIGNMENT_STATUS_OPTIONS,
  NUTRITION_TEMPLATE_STATUS_OPTIONS,
  sortMealLogs,
  sortNutritionAssignments,
  sortNutritionCheckins,
  sortNutritionTemplates,
} from './nutritionHelpers';

const StaffNutritionPage = () => {
  const { loading, profile, isConfigured } = useAuth();

  const [tab, setTab] = useState('templates');
  const [pageLoading, setPageLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const [templates, setTemplates] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');

  const [mealLogs, setMealLogs] = useState([]);
  const [checkins, setCheckins] = useState([]);

  const [templateForm, setTemplateForm] = useState(createEmptyNutritionTemplate);
  const [assignmentForm, setAssignmentForm] = useState(createEmptyNutritionAssignment);
  const [mealForm, setMealForm] = useState(createEmptyMealLog);
  const [checkinForm, setCheckinForm] = useState(createEmptyNutritionCheckin);

  const [mealFeedback, setMealFeedback] = useState({ type: '', message: '' });
  const [checkinFeedback, setCheckinFeedback] = useState({ type: '', message: '' });

  const [savingTemplate, setSavingTemplate] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [savingMealLog, setSavingMealLog] = useState(false);
  const [savingCheckin, setSavingCheckin] = useState(false);

  const loadWorkspace = useCallback(async () => {
    if (!isConfigured) {
      setPageLoading(false);
      return;
    }

    try {
      setPageLoading(true);

      const [templateRows, assignmentRows, memberRows] = await Promise.all([
        fetchNutritionTemplates({ includeArchived: true, limit: 80 }),
        fetchNutritionAssignments({ limit: 120 }),
        fetchMembers(),
      ]);

      const memberOptions = memberRows.filter((member) => member.role === 'member');

      setTemplates(sortNutritionTemplates(templateRows));
      setAssignments(sortNutritionAssignments(assignmentRows));
      setMembers(memberOptions);

      if (memberOptions[0]?.id) {
        setSelectedMemberId((current) => current || memberOptions[0].id);
        setAssignmentForm((current) => ({
          ...current,
          member_id: current.member_id || memberOptions[0].id,
        }));
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to load the nutrition workspace.',
      });
    } finally {
      setPageLoading(false);
    }
  }, [isConfigured]);

  const loadSelectedMemberActivity = useCallback(async () => {
    if (!selectedMemberId || !isConfigured) {
      setMealLogs([]);
      setCheckins([]);
      return;
    }

    try {
      const [mealRows, checkinRows] = await Promise.all([
        fetchMealLogs(selectedMemberId, { limit: 80 }),
        fetchNutritionCheckins(selectedMemberId, 40),
      ]);

      setMealLogs(sortMealLogs(mealRows));
      setCheckins(sortNutritionCheckins(checkinRows));
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to load the selected member nutrition history.',
      });
    }
  }, [isConfigured]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    loadSelectedMemberActivity();
  }, [loadSelectedMemberActivity]);

  const selectedMember = useMemo(() => (
    members.find((member) => member.id === selectedMemberId) || null
  ), [members, selectedMemberId]);

  const selectedMemberAssignments = useMemo(() => (
    sortNutritionAssignments(assignments.filter((assignment) => assignment.member_id === selectedMemberId))
  ), [assignments, selectedMemberId]);

  const activeMemberAssignment = useMemo(() => (
    selectedMemberAssignments.find((assignment) => assignment.assignment_status === 'active')
    || selectedMemberAssignments[0]
    || null
  ), [selectedMemberAssignments]);

  const memberSummary = useMemo(() => (
    buildNutritionAssignmentSummary(activeMemberAssignment, mealLogs, checkins)
  ), [activeMemberAssignment, mealLogs, checkins]);

  const workspaceStats = useMemo(() => ({
    templateCount: templates.length,
    activeAssignments: assignments.filter((assignment) => assignment.assignment_status === 'active').length,
    memberCount: members.length,
    selectedMemberLogsThisWeek: memberSummary.logsThisWeekCount || 0,
  }), [assignments, memberSummary.logsThisWeekCount, members.length, templates.length]);

  const updateTemplateField = (field) => (event) => {
    const { value } = event.target;
    setTemplateForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateTemplateDayField = (clientId, field) => (event) => {
    const { value } = event.target;

    setTemplateForm((current) => ({
      ...current,
      days: current.days.map((day, index) => (
        day.client_id === clientId
          ? {
            ...day,
            day_index: index + 1,
            [field]: value,
          }
          : {
            ...day,
            day_index: index + 1,
          }
      )),
    }));
  };

  const addTemplateDay = () => {
    setTemplateForm((current) => ({
      ...current,
      days: [
        ...current.days,
        createEmptyNutritionTemplateDay(current.days.length + 1),
      ],
    }));
  };

  const removeTemplateDay = (clientId) => {
    setTemplateForm((current) => ({
      ...current,
      days: current.days.length === 1
        ? current.days
        : current.days
          .filter((day) => day.client_id !== clientId)
          .map((day, index) => ({
            ...day,
            day_index: index + 1,
          })),
    }));
  };

  const updateAssignmentField = (field) => (event) => {
    const { value } = event.target;
    setAssignmentForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

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

  const resetTemplateForm = () => {
    setTemplateForm(createEmptyNutritionTemplate());
  };

  const resetAssignmentForm = useCallback((memberId = selectedMemberId) => {
    setAssignmentForm({
      ...createEmptyNutritionAssignment(),
      member_id: memberId || '',
    });
  }, [selectedMemberId]);

  const resetMealForm = useCallback((assignmentId = activeMemberAssignment?.id || '') => {
    setMealForm({
      ...createEmptyMealLog(),
      assignment_id: assignmentId,
    });
  }, [activeMemberAssignment]);

  const resetCheckinForm = useCallback((assignmentId = activeMemberAssignment?.id || '') => {
    setCheckinForm({
      ...createEmptyNutritionCheckin(),
      assignment_id: assignmentId,
    });
  }, [activeMemberAssignment]);

  const handleSaveTemplate = async (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });

    try {
      setSavingTemplate(true);
      const savedTemplate = await saveNutritionTemplate(templateForm, profile?.id || null);

      setTemplates((current) => sortNutritionTemplates([
        savedTemplate,
        ...current.filter((template) => template.id !== savedTemplate.id),
      ]));
      setFeedback({
        type: 'success',
        message: templateForm.id ? 'Nutrition template updated.' : 'Nutrition template saved.',
      });
      resetTemplateForm();
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to save this nutrition template.',
      });
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleSaveAssignment = async (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });

    try {
      setSavingAssignment(true);

      const payload = {
        ...assignmentForm,
        member_id: assignmentForm.member_id || selectedMemberId,
      };

      const savedAssignment = await saveNutritionAssignment(payload, profile?.id || null);

      setAssignments((current) => sortNutritionAssignments([
        savedAssignment,
        ...current.filter((assignment) => assignment.id !== savedAssignment.id),
      ]));
      setFeedback({
        type: 'success',
        message: assignmentForm.id ? 'Nutrition assignment updated.' : 'Nutrition assignment saved.',
      });

      if (savedAssignment.member_id) {
        setSelectedMemberId(savedAssignment.member_id);
      }

      resetAssignmentForm(savedAssignment.member_id || selectedMemberId);
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to save this nutrition assignment.',
      });
    } finally {
      setSavingAssignment(false);
    }
  };

  const handleSaveMealLog = async (event) => {
    event.preventDefault();
    setMealFeedback({ type: '', message: '' });

    if (!selectedMemberId) {
      setMealFeedback({
        type: 'error',
        message: 'Select a member before saving meal logs.',
      });
      return;
    }

    try {
      setSavingMealLog(true);

      const payload = {
        ...mealForm,
        assignment_id: mealForm.assignment_id || activeMemberAssignment?.id || '',
      };

      const savedEntry = await saveMealLog(selectedMemberId, payload, {
        recordedBy: profile?.id || null,
        entrySource: 'staff_console',
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

    if (!selectedMemberId) {
      setCheckinFeedback({
        type: 'error',
        message: 'Select a member before saving check-ins.',
      });
      return;
    }

    try {
      setSavingCheckin(true);

      const payload = {
        ...checkinForm,
        assignment_id: checkinForm.assignment_id || activeMemberAssignment?.id || '',
      };

      const savedEntry = await saveNutritionCheckin(selectedMemberId, payload, {
        recordedBy: profile?.id || null,
        entrySource: 'staff_console',
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
    return <LoadingScreen message="Loading staff nutrition tools..." />;
  }

  return (
    <Box sx={{ py: { xs: 3, md: 5 } }}>
      <SetupNotice title="Staff nutrition tools need Supabase setup" />

      <Stack spacing={1.5} mb={4}>
        <Typography color="#ff2625" fontWeight={700}>
          Staff nutrition workspace
        </Typography>
        <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '32px', md: '42px' } }}>
          Build meal plans, assign targets, and coach member adherence
        </Typography>
        <Typography color="text.secondary" maxWidth="920px">
          Create reusable nutrition templates, assign them to members, and monitor real-world meal logging and check-ins from one workspace.
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button
            component={RouterLink}
            to={PATHS.staffWorkouts}
            variant="outlined"
            startIcon={<FitnessCenter />}
            sx={{ borderRadius: 999, alignSelf: 'flex-start' }}
          >
            Workout programming
          </Button>
          <Button
            component={RouterLink}
            to={PATHS.staff}
            variant="outlined"
            startIcon={<RestaurantMenu />}
            sx={{ borderRadius: 999, alignSelf: 'flex-start' }}
          >
            Front desk
          </Button>
        </Stack>
      </Stack>

      {feedback.message ? (
        <Alert severity={feedback.type || 'info'} sx={{ mb: 3, borderRadius: 3 }}>
          {feedback.message}
        </Alert>
      ) : null}

      <Grid container spacing={3} mb={1}>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Templates"
            value={workspaceStats.templateCount}
            caption="Reusable nutrition templates"
            icon={RestaurantMenu}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Active assignments"
            value={workspaceStats.activeAssignments}
            caption="Members currently on plan"
            icon={FitnessCenter}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Tracked members"
            value={workspaceStats.memberCount}
            caption="Members available for nutrition coaching"
            icon={RestaurantMenu}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Selected member logs"
            value={workspaceStats.selectedMemberLogsThisWeek}
            caption="Meal logs in the last 7 days"
            icon={RestaurantMenu}
          />
        </Grid>

        <Grid item xs={12}>
          <Paper className="surface-card" sx={{ borderRadius: 4, overflow: 'hidden', background: '#fff' }}>
            <Tabs
              value={tab}
              onChange={(_event, nextValue) => setTab(nextValue)}
              variant="scrollable"
              allowScrollButtonsMobile
              sx={{ px: 2, pt: 2 }}
            >
              <Tab label="Templates" value="templates" />
              <Tab label="Assignments" value="assignments" />
              <Tab label="Member review" value="review" />
            </Tabs>

            <Divider />

            <Box sx={{ p: { xs: 2, md: 3 } }}>
              {tab === 'templates' ? (
                <Grid container spacing={3}>
                  <Grid item xs={12} lg={7}>
                    <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, boxShadow: 'none' }}>
                      <Box component="form" onSubmit={handleSaveTemplate}>
                        <Stack spacing={2.5}>
                          <Stack spacing={0.5}>
                            <Typography variant="h5" fontWeight={800}>
                              {templateForm.id ? 'Edit nutrition template' : 'Create nutrition template'}
                            </Typography>
                            <Typography color="text.secondary">
                              Build repeatable calorie, macro, hydration, and meal guidance plans for members.
                            </Typography>
                          </Stack>

                          <TextField
                            label="Template name"
                            value={templateForm.name}
                            onChange={updateTemplateField('name')}
                            fullWidth
                            required
                          />

                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                              <TextField
                                label="Goal"
                                value={templateForm.goal}
                                onChange={updateTemplateField('goal')}
                                fullWidth
                              />
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <TextField
                                select
                                label="Status"
                                value={templateForm.status}
                                onChange={updateTemplateField('status')}
                                fullWidth
                              >
                                {NUTRITION_TEMPLATE_STATUS_OPTIONS.map((option) => (
                                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                ))}
                              </TextField>
                            </Grid>
                          </Grid>

                          <TextField
                            label="Template description"
                            value={templateForm.description}
                            onChange={updateTemplateField('description')}
                            fullWidth
                            multiline
                            minRows={3}
                          />

                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6} md={4}>
                              <TextField
                                label="Calories"
                                type="number"
                                value={templateForm.default_calories}
                                onChange={updateTemplateField('default_calories')}
                                fullWidth
                              />
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                              <TextField
                                label="Protein (g)"
                                type="number"
                                value={templateForm.default_protein_g}
                                onChange={updateTemplateField('default_protein_g')}
                                fullWidth
                              />
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                              <TextField
                                label="Carbs (g)"
                                type="number"
                                value={templateForm.default_carbs_g}
                                onChange={updateTemplateField('default_carbs_g')}
                                fullWidth
                              />
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                              <TextField
                                label="Fat (g)"
                                type="number"
                                value={templateForm.default_fat_g}
                                onChange={updateTemplateField('default_fat_g')}
                                fullWidth
                              />
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                              <TextField
                                label="Fiber (g)"
                                type="number"
                                value={templateForm.default_fiber_g}
                                onChange={updateTemplateField('default_fiber_g')}
                                fullWidth
                              />
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                              <TextField
                                label="Hydration (L)"
                                type="number"
                                inputProps={{ step: '0.1' }}
                                value={templateForm.hydration_target_liters}
                                onChange={updateTemplateField('hydration_target_liters')}
                                fullWidth
                              />
                            </Grid>
                          </Grid>

                          <Divider />

                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="h6" fontWeight={800}>
                              Day-by-day guidance
                            </Typography>
                            <Button startIcon={<Add />} onClick={addTemplateDay} sx={{ textTransform: 'none' }}>
                              Add day
                            </Button>
                          </Stack>

                          <Stack spacing={2.5}>
                            {templateForm.days.map((day, index) => (
                              <Paper key={day.client_id} variant="outlined" sx={{ p: 2.5, borderRadius: 3, boxShadow: 'none' }}>
                                <Stack spacing={2}>
                                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="h6" fontWeight={800}>
                                      Day {index + 1}
                                    </Typography>
                                    <IconButton
                                      color="error"
                                      size="small"
                                      onClick={() => removeTemplateDay(day.client_id)}
                                      disabled={templateForm.days.length === 1}
                                    >
                                      <DeleteOutline fontSize="small" />
                                    </IconButton>
                                  </Stack>

                                  <Grid container spacing={2}>
                                    <Grid item xs={12} md={6}>
                                      <TextField
                                        label="Day title"
                                        value={day.title}
                                        onChange={updateTemplateDayField(day.client_id, 'title')}
                                        fullWidth
                                        required
                                      />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                      <TextField
                                        label="Hydration (L)"
                                        type="number"
                                        inputProps={{ step: '0.1' }}
                                        value={day.hydration_target_liters}
                                        onChange={updateTemplateDayField(day.client_id, 'hydration_target_liters')}
                                        fullWidth
                                      />
                                    </Grid>
                                  </Grid>

                                  <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6} md={4} lg={2}>
                                      <TextField
                                        label="Calories"
                                        type="number"
                                        value={day.calorie_target}
                                        onChange={updateTemplateDayField(day.client_id, 'calorie_target')}
                                        fullWidth
                                      />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={4} lg={2}>
                                      <TextField
                                        label="Protein (g)"
                                        type="number"
                                        value={day.protein_target_g}
                                        onChange={updateTemplateDayField(day.client_id, 'protein_target_g')}
                                        fullWidth
                                      />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={4} lg={2}>
                                      <TextField
                                        label="Carbs (g)"
                                        type="number"
                                        value={day.carbs_target_g}
                                        onChange={updateTemplateDayField(day.client_id, 'carbs_target_g')}
                                        fullWidth
                                      />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={4} lg={2}>
                                      <TextField
                                        label="Fat (g)"
                                        type="number"
                                        value={day.fat_target_g}
                                        onChange={updateTemplateDayField(day.client_id, 'fat_target_g')}
                                        fullWidth
                                      />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={4} lg={2}>
                                      <TextField
                                        label="Fiber (g)"
                                        type="number"
                                        value={day.fiber_target_g}
                                        onChange={updateTemplateDayField(day.client_id, 'fiber_target_g')}
                                        fullWidth
                                      />
                                    </Grid>
                                  </Grid>

                                  <TextField
                                    label="Meal guidance"
                                    value={day.meal_guidance}
                                    onChange={updateTemplateDayField(day.client_id, 'meal_guidance')}
                                    fullWidth
                                    multiline
                                    minRows={3}
                                  />
                                </Stack>
                              </Paper>
                            ))}
                          </Stack>

                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="flex-end">
                            {templateForm.id ? (
                              <Button
                                variant="text"
                                onClick={resetTemplateForm}
                                disabled={savingTemplate}
                                sx={{ textTransform: 'none', borderRadius: 999 }}
                              >
                                Cancel edit
                              </Button>
                            ) : null}
                            <Button
                              type="submit"
                              variant="contained"
                              disabled={savingTemplate}
                              sx={{
                                bgcolor: '#ff2625',
                                textTransform: 'none',
                                borderRadius: 999,
                                '&:hover': { bgcolor: '#df1d1d' },
                              }}
                            >
                              {(() => {
                                if (savingTemplate) return 'Saving...';
                                if (templateForm.id) return 'Update template';
                                return 'Save template';
                              })()}
                            </Button>
                          </Stack>
                        </Stack>
                      </Box>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} lg={5}>
                    <Stack spacing={2}>
                      {templates.map((template) => {
                        const templateMeta = getNutritionTemplateStatusMeta(template.status);

                        return (
                          <Paper key={template.id} variant="outlined" sx={{ p: 2.5, borderRadius: 3, boxShadow: 'none' }}>
                            <Stack spacing={1.5}>
                              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                                <Box>
                                  <Typography variant="h6" fontWeight={800}>
                                    {template.name}
                                  </Typography>
                                  <Typography color="text.secondary">
                                    {template.goal || template.description || 'Nutrition template'}
                                  </Typography>
                                </Box>
                                <IconButton onClick={() => setTemplateForm(normaliseNutritionTemplateForForm(template))}>
                                  <EditOutlined />
                                </IconButton>
                              </Stack>

                              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Chip label={templateMeta.label} sx={getNutritionTemplateStatusChipSx(template.status)} />
                                <Chip label={`${template.days?.length || 0} day blocks`} />
                              </Stack>

                              <Typography variant="body2" color="text.secondary">
                                {formatMacroTargets({
                                  calories: template.default_calories,
                                  protein_g: template.default_protein_g,
                                  carbs_g: template.default_carbs_g,
                                  fat_g: template.default_fat_g,
                                  fiber_g: template.default_fiber_g,
                                  hydration_liters: template.hydration_target_liters,
                                })}
                              </Typography>
                            </Stack>
                          </Paper>
                        );
                      })}

                      {!templates.length ? (
                        <Alert severity="info" sx={{ borderRadius: 3 }}>
                          No nutrition templates created yet.
                        </Alert>
                      ) : null}
                    </Stack>
                  </Grid>
                </Grid>
              ) : null}

              {tab === 'assignments' ? (
                <Grid container spacing={3}>
                  <Grid item xs={12} lg={6}>
                    <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, boxShadow: 'none' }}>
                      <Box component="form" onSubmit={handleSaveAssignment}>
                        <Stack spacing={2.5}>
                          <Stack spacing={0.5}>
                            <Typography variant="h5" fontWeight={800}>
                              {assignmentForm.id ? 'Edit nutrition assignment' : 'Assign a nutrition plan'}
                            </Typography>
                            <Typography color="text.secondary">
                              Pair a member with a template and override calorie or macro targets when needed.
                            </Typography>
                          </Stack>

                          <TextField
                            select
                            label="Member"
                            value={assignmentForm.member_id}
                            onChange={(event) => {
                              updateAssignmentField('member_id')(event);
                              setSelectedMemberId(event.target.value);
                            }}
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
                            label="Template"
                            value={assignmentForm.template_id}
                            onChange={updateAssignmentField('template_id')}
                            fullWidth
                            required
                          >
                            {templates.map((template) => (
                              <MenuItem key={template.id} value={template.id}>
                                {template.name}
                              </MenuItem>
                            ))}
                          </TextField>

                          <Grid container spacing={2}>
                            <Grid item xs={12} md={4}>
                              <TextField
                                select
                                label="Status"
                                value={assignmentForm.assignment_status}
                                onChange={updateAssignmentField('assignment_status')}
                                fullWidth
                              >
                                {NUTRITION_ASSIGNMENT_STATUS_OPTIONS.map((option) => (
                                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                ))}
                              </TextField>
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <TextField
                                label="Start date"
                                type="date"
                                value={assignmentForm.start_date}
                                onChange={updateAssignmentField('start_date')}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                              />
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <TextField
                                label="End date"
                                type="date"
                                value={assignmentForm.end_date}
                                onChange={updateAssignmentField('end_date')}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                              />
                            </Grid>
                          </Grid>

                          <TextField
                            label="Goal note"
                            value={assignmentForm.goal_note}
                            onChange={updateAssignmentField('goal_note')}
                            fullWidth
                            multiline
                            minRows={2}
                          />

                          <TextField
                            label="Coach notes"
                            value={assignmentForm.coach_notes}
                            onChange={updateAssignmentField('coach_notes')}
                            fullWidth
                            multiline
                            minRows={2}
                          />

                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6} md={4}>
                              <TextField
                                label="Calories override"
                                type="number"
                                value={assignmentForm.calorie_target_override}
                                onChange={updateAssignmentField('calorie_target_override')}
                                fullWidth
                              />
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                              <TextField
                                label="Protein override (g)"
                                type="number"
                                value={assignmentForm.protein_target_override}
                                onChange={updateAssignmentField('protein_target_override')}
                                fullWidth
                              />
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                              <TextField
                                label="Carbs override (g)"
                                type="number"
                                value={assignmentForm.carbs_target_override}
                                onChange={updateAssignmentField('carbs_target_override')}
                                fullWidth
                              />
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                              <TextField
                                label="Fat override (g)"
                                type="number"
                                value={assignmentForm.fat_target_override}
                                onChange={updateAssignmentField('fat_target_override')}
                                fullWidth
                              />
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                              <TextField
                                label="Fiber override (g)"
                                type="number"
                                value={assignmentForm.fiber_target_override}
                                onChange={updateAssignmentField('fiber_target_override')}
                                fullWidth
                              />
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                              <TextField
                                label="Hydration override (L)"
                                type="number"
                                inputProps={{ step: '0.1' }}
                                value={assignmentForm.hydration_target_override}
                                onChange={updateAssignmentField('hydration_target_override')}
                                fullWidth
                              />
                            </Grid>
                          </Grid>

                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="flex-end">
                            {assignmentForm.id ? (
                              <Button
                                variant="text"
                                onClick={() => resetAssignmentForm()}
                                disabled={savingAssignment}
                                sx={{ textTransform: 'none', borderRadius: 999 }}
                              >
                                Cancel edit
                              </Button>
                            ) : null}
                            <Button
                              type="submit"
                              variant="contained"
                              disabled={savingAssignment}
                              sx={{
                                bgcolor: '#ff2625',
                                textTransform: 'none',
                                borderRadius: 999,
                                '&:hover': { bgcolor: '#df1d1d' },
                              }}
                            >
                              {(() => {
                                if (savingAssignment) return 'Saving...';
                                if (assignmentForm.id) return 'Update assignment';
                                return 'Save assignment';
                              })()}
                            </Button>
                          </Stack>
                        </Stack>
                      </Box>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} lg={6}>
                    <Stack spacing={2}>
                      {!selectedMemberId ? (
                        <Alert severity="info" sx={{ borderRadius: 3 }}>
                          Add members first so you can assign nutrition plans.
                        </Alert>
                      ) : null}

                      {selectedMemberAssignments.map((assignment) => {
                        const assignmentMeta = getNutritionAssignmentStatusMeta(assignment.assignment_status);

                        return (
                          <Paper key={assignment.id} variant="outlined" sx={{ p: 2.5, borderRadius: 3, boxShadow: 'none' }}>
                            <Stack spacing={1.5}>
                              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                                <Box>
                                  <Typography variant="h6" fontWeight={800}>
                                    {assignment.template?.name || 'Nutrition plan'}
                                  </Typography>
                                  <Typography color="text.secondary">
                                    {assignment.member?.full_name || assignment.member?.email || 'Member'}
                                  </Typography>
                                </Box>
                                <IconButton onClick={() => setAssignmentForm(normaliseNutritionAssignmentForForm(assignment))}>
                                  <EditOutlined />
                                </IconButton>
                              </Stack>

                              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Chip label={assignmentMeta.label} sx={getNutritionAssignmentStatusChipSx(assignment.assignment_status)} />
                                <Chip label={formatAssignmentDateRange(assignment.start_date, assignment.end_date)} />
                              </Stack>

                              <Typography variant="body2" color="text.secondary">
                                {formatMacroTargets({
                                  calories: assignment.calorie_target_override || assignment.template?.default_calories,
                                  protein_g: assignment.protein_target_override || assignment.template?.default_protein_g,
                                  carbs_g: assignment.carbs_target_override || assignment.template?.default_carbs_g,
                                  fat_g: assignment.fat_target_override || assignment.template?.default_fat_g,
                                  fiber_g: assignment.fiber_target_override || assignment.template?.default_fiber_g,
                                  hydration_liters: assignment.hydration_target_override || assignment.template?.hydration_target_liters,
                                })}
                              </Typography>
                            </Stack>
                          </Paper>
                        );
                      })}

                      {selectedMemberId && !selectedMemberAssignments.length ? (
                        <Alert severity="info" sx={{ borderRadius: 3 }}>
                          This member does not have a nutrition assignment yet.
                        </Alert>
                      ) : null}
                    </Stack>
                  </Grid>
                </Grid>
              ) : null}

              {tab === 'review' ? (
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, boxShadow: 'none' }}>
                      <Stack spacing={2.5}>
                        <TextField
                          select
                          label="Selected member"
                          value={selectedMemberId}
                          onChange={(event) => {
                            const nextMemberId = event.target.value;
                            setSelectedMemberId(nextMemberId);
                            setAssignmentForm((current) => ({ ...current, member_id: nextMemberId }));
                          }}
                          fullWidth
                        >
                          {members.map((member) => (
                            <MenuItem key={member.id} value={member.id}>
                              {member.full_name || member.email}
                            </MenuItem>
                          ))}
                        </TextField>

                        {selectedMember ? (
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={4}>
                              <Typography color="#ff2625" fontWeight={700}>
                                Current member
                              </Typography>
                              <Typography variant="h5" fontWeight={800}>
                                {selectedMember.full_name || selectedMember.email}
                              </Typography>
                              <Typography color="text.secondary">
                                {selectedMember.membership_status} • {selectedMember.plan?.name || 'No membership plan'}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} md={8}>
                              <Stack spacing={1}>
                                <Typography fontWeight={700}>
                                  {activeMemberAssignment?.template?.name || 'No active nutrition plan'}
                                </Typography>
                                <Typography color="text.secondary">
                                  {activeMemberAssignment?.template?.goal || activeMemberAssignment?.goal_note || 'Assign a plan to start nutrition coaching.'}
                                </Typography>
                                {activeMemberAssignment ? (
                                  <>
                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                      <Chip
                                        label={getNutritionAssignmentStatusMeta(activeMemberAssignment.assignment_status).label}
                                        sx={getNutritionAssignmentStatusChipSx(activeMemberAssignment.assignment_status)}
                                      />
                                      <Chip label={formatAssignmentDateRange(activeMemberAssignment.start_date, activeMemberAssignment.end_date)} />
                                    </Stack>
                                    <Typography variant="body2" color="text.secondary">
                                      {formatMacroTargets(memberSummary.targets)}
                                    </Typography>
                                  </>
                                ) : null}
                              </Stack>
                            </Grid>
                          </Grid>
                        ) : (
                          <Alert severity="info" sx={{ borderRadius: 3 }}>
                            Choose a member to review their nutrition history.
                          </Alert>
                        )}
                      </Stack>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} lg={7}>
                    <MealLogsCard
                      title="Member meal logs"
                      subtitle="Review member adherence, hydration, and logged meal macros."
                      logs={mealLogs}
                      form={mealForm}
                      feedback={mealFeedback}
                      saving={savingMealLog}
                      disableActions={!selectedMemberId}
                      assignmentOptions={selectedMemberAssignments}
                      showAssignmentSelector
                      onFieldChange={updateMealField}
                      onSubmit={handleSaveMealLog}
                      onCancelEdit={() => resetMealForm()}
                      onEdit={(entry) => setMealForm(normaliseMealLogForForm(entry))}
                      onDelete={handleDeleteMealLog}
                    />
                  </Grid>

                  <Grid item xs={12} lg={5}>
                    <NutritionCheckinsCard
                      title="Member nutrition check-ins"
                      subtitle="Document weekly outcomes, hunger/energy trends, and coach feedback."
                      entries={checkins}
                      form={checkinForm}
                      feedback={checkinFeedback}
                      saving={savingCheckin}
                      disableActions={!selectedMemberId}
                      allowCoachFeedback
                      assignmentOptions={selectedMemberAssignments}
                      showAssignmentSelector
                      onFieldChange={updateCheckinField}
                      onSubmit={handleSaveCheckin}
                      onCancelEdit={() => resetCheckinForm()}
                      onEdit={(entry) => setCheckinForm(normaliseNutritionCheckinForForm(entry))}
                      onDelete={handleDeleteCheckin}
                    />
                  </Grid>
                </Grid>
              ) : null}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StaffNutritionPage;
