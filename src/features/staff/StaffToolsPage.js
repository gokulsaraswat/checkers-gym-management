import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  AssignmentInd,
  CalendarMonth,
  MonetizationOn,
  Paid,
  Refresh,
  SaveOutlined,
  WorkHistory,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

import { PATHS } from '../../app/paths';
import EmptyStateCard from '../../components/common/EmptyStateCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import MetricCard from '../../components/common/MetricCard';
import SetupNotice from '../../components/common/SetupNotice';
import { useAuth } from '../../context/AuthContext';
import {
  closeStaffClientAssignment,
  fetchClassSessions,
  fetchMembers,
  fetchStaffClientAssignments,
  fetchStaffCommissionEntries,
  fetchStaffCompensationProfile,
  fetchStaffDirectory,
  fetchStaffShiftReports,
  saveStaffClientAssignment,
  saveStaffCommissionEntry,
  saveStaffCompensationProfile,
  saveStaffShiftReport,
} from '../../services/gymService';
import {
  buildStaffToolsStats,
  createEmptyAssignmentForm,
  createEmptyCommissionEntryForm,
  createEmptyCompensationForm,
  createEmptyShiftReportForm,
  formatCurrency,
  formatHours,
  formatStaffDate,
  formatStaffDateTime,
  getAssignmentStatusChipSx,
  getAssignmentStatusLabel,
  getCommissionStatusChipSx,
  getCommissionStatusLabel,
  getShiftTypeLabel,
  normaliseCompensationForm,
  sortAssignments,
  sortCommissionEntries,
  sortShiftReports,
  STAFF_ASSIGNMENT_ROLE_OPTIONS,
  STAFF_ASSIGNMENT_STATUS_OPTIONS,
  STAFF_COMMISSION_SOURCE_OPTIONS,
  STAFF_COMMISSION_STATUS_OPTIONS,
  STAFF_PAYOUT_CYCLE_OPTIONS,
  STAFF_SHIFT_TYPE_OPTIONS,
  todayIsoDate,
} from './staffToolsHelpers';

const createFeedback = () => ({ type: '', message: '' });

const StaffToolsPage = () => {
  const { user, profile, loading, isConfigured } = useAuth();

  const [staffDirectory, setStaffDirectory] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');

  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState('all');
  const [commissionStatusFilter, setCommissionStatusFilter] = useState('all');

  const [assignments, setAssignments] = useState([]);
  const [shiftReports, setShiftReports] = useState([]);
  const [compensationProfile, setCompensationProfile] = useState(null);
  const [commissionEntries, setCommissionEntries] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);

  const [assignmentForm, setAssignmentForm] = useState(createEmptyAssignmentForm());
  const [shiftForm, setShiftForm] = useState(createEmptyShiftReportForm());
  const [compensationForm, setCompensationForm] = useState(createEmptyCompensationForm());
  const [commissionEntryForm, setCommissionEntryForm] = useState(createEmptyCommissionEntryForm());

  const [pageLoading, setPageLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [savingShift, setSavingShift] = useState(false);
  const [savingCompensation, setSavingCompensation] = useState(false);
  const [savingCommission, setSavingCommission] = useState(false);
  const [actingAssignmentId, setActingAssignmentId] = useState('');
  const [feedback, setFeedback] = useState(createFeedback());

  const isAdmin = profile?.role === 'admin';
  const targetStaffId = isAdmin ? selectedStaffId : (user?.id || '');

  const selectedStaff = useMemo(
    () => staffDirectory.find((item) => item.id === targetStaffId) || null,
    [staffDirectory, targetStaffId],
  );

  const memberOptions = useMemo(
    () => members.filter((item) => item.role === 'member' && item.is_active),
    [members],
  );

  const sortedAssignments = useMemo(() => sortAssignments(assignments), [assignments]);
  const sortedShiftReports = useMemo(() => sortShiftReports(shiftReports), [shiftReports]);
  const sortedCommissionEntries = useMemo(
    () => sortCommissionEntries(commissionEntries),
    [commissionEntries],
  );

  const stats = useMemo(
    () => buildStaffToolsStats({
      assignments: sortedAssignments,
      commissionEntries: sortedCommissionEntries,
      upcomingSessions,
      shiftReports: sortedShiftReports,
    }),
    [sortedAssignments, sortedCommissionEntries, upcomingSessions, sortedShiftReports],
  );

  const loadDirectories = useCallback(async () => {
    if (!isConfigured || !user) {
      setPageLoading(false);
      return;
    }

    try {
      const [staffRows, memberRows] = await Promise.all([
        fetchStaffDirectory('', true, 80),
        isAdmin ? fetchMembers() : Promise.resolve([]),
      ]);

      setStaffDirectory(staffRows);
      setMembers((memberRows || []).filter((item) => item.role === 'member'));

      if (isAdmin) {
        setSelectedStaffId((currentValue) => currentValue || user.id);
      } else {
        setSelectedStaffId(user.id);
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to load staff tools directories.',
      });
      setPageLoading(false);
    }
  }, [isAdmin, isConfigured, user]);

  const loadWorkspace = useCallback(async (showPageLoader = false) => {
    if (!isConfigured || !targetStaffId) {
      setPageLoading(false);
      return;
    }

    try {
      if (showPageLoader) {
        setPageLoading(true);
      } else {
        setRefreshing(true);
      }

      const [assignmentRows, reportRows, profileRow, commissionRows, sessionRows] = await Promise.all([
        fetchStaffClientAssignments({
          staffId: targetStaffId,
          status: assignmentStatusFilter,
          limit: 120,
        }),
        fetchStaffShiftReports({
          staffId: targetStaffId,
          limit: 30,
        }),
        fetchStaffCompensationProfile(targetStaffId),
        fetchStaffCommissionEntries({
          staffId: targetStaffId,
          status: commissionStatusFilter,
          limit: 80,
        }),
        fetchClassSessions({
          trainerId: targetStaffId,
          startDate: todayIsoDate(),
          status: 'scheduled',
          visibility: 'all',
          includeInactive: false,
          limit: 10,
        }),
      ]);

      setAssignments(assignmentRows);
      setShiftReports(reportRows);
      setCompensationProfile(profileRow);
      setCommissionEntries(commissionRows);
      setUpcomingSessions(sessionRows);
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to load the staff workspace.',
      });
    } finally {
      setPageLoading(false);
      setRefreshing(false);
    }
  }, [assignmentStatusFilter, commissionStatusFilter, isConfigured, targetStaffId]);

  useEffect(() => {
    loadDirectories();
  }, [loadDirectories]);

  useEffect(() => {
    if (!targetStaffId) {
      return;
    }

    loadWorkspace(true);
  }, [loadWorkspace, targetStaffId]);

  useEffect(() => {
    if (!targetStaffId) {
      return;
    }

    setAssignmentForm(createEmptyAssignmentForm(targetStaffId));
    setShiftForm(createEmptyShiftReportForm(targetStaffId));
    setCommissionEntryForm(createEmptyCommissionEntryForm(targetStaffId));
  }, [targetStaffId]);

  useEffect(() => {
    setCompensationForm(normaliseCompensationForm(compensationProfile, targetStaffId));
  }, [compensationProfile, targetStaffId]);

  const handleRefresh = async () => {
    await Promise.all([
      loadDirectories(),
      loadWorkspace(false),
    ]);
  };

  const handleSaveAssignment = async (event) => {
    event.preventDefault();

    if (!isAdmin) {
      return;
    }

    try {
      setSavingAssignment(true);
      setFeedback(createFeedback());
      await saveStaffClientAssignment({
        ...assignmentForm,
        staff_id: assignmentForm.staff_id || targetStaffId,
      });
      setAssignmentForm(createEmptyAssignmentForm(targetStaffId));
      await loadWorkspace(false);
      setFeedback({
        type: 'success',
        message: 'Client assignment saved.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to save the client assignment.',
      });
    } finally {
      setSavingAssignment(false);
    }
  };

  const handleCloseAssignment = async (assignmentId) => {
    if (!assignmentId) {
      return;
    }

    try {
      setActingAssignmentId(assignmentId);
      setFeedback(createFeedback());
      await closeStaffClientAssignment(assignmentId);
      await loadWorkspace(false);
      setFeedback({
        type: 'success',
        message: 'Assignment closed.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to close the assignment.',
      });
    } finally {
      setActingAssignmentId('');
    }
  };

  const handleSaveShiftReport = async (event) => {
    event.preventDefault();

    try {
      setSavingShift(true);
      setFeedback(createFeedback());
      await saveStaffShiftReport({
        ...shiftForm,
        staff_id: shiftForm.staff_id || targetStaffId,
      });
      setShiftForm(createEmptyShiftReportForm(targetStaffId));
      await loadWorkspace(false);
      setFeedback({
        type: 'success',
        message: 'Shift report saved.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to save the shift report.',
      });
    } finally {
      setSavingShift(false);
    }
  };

  const handleSaveCompensation = async (event) => {
    event.preventDefault();

    if (!isAdmin) {
      return;
    }

    try {
      setSavingCompensation(true);
      setFeedback(createFeedback());
      const savedProfile = await saveStaffCompensationProfile(targetStaffId, compensationForm);
      setCompensationProfile(savedProfile);
      setCompensationForm(normaliseCompensationForm(savedProfile, targetStaffId));
      setFeedback({
        type: 'success',
        message: 'Compensation profile updated.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to update compensation.',
      });
    } finally {
      setSavingCompensation(false);
    }
  };

  const handleSaveCommissionEntry = async (event) => {
    event.preventDefault();

    if (!isAdmin) {
      return;
    }

    try {
      setSavingCommission(true);
      setFeedback(createFeedback());
      await saveStaffCommissionEntry({
        ...commissionEntryForm,
        staff_id: commissionEntryForm.staff_id || targetStaffId,
      });
      setCommissionEntryForm(createEmptyCommissionEntryForm(targetStaffId));
      await loadWorkspace(false);
      setFeedback({
        type: 'success',
        message: 'Commission entry saved.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to save the commission entry.',
      });
    } finally {
      setSavingCommission(false);
    }
  };

  if (loading || pageLoading) {
    return <LoadingScreen message="Loading staff tools..." />;
  }

  return (
    <Box sx={{ py: { xs: 3, md: 5 } }}>
      <SetupNotice title="Staff tools need Supabase setup" />

      <Stack spacing={1.5} mb={4}>
        <Typography color="#ff2625" fontWeight={700}>
          Staff tools
        </Typography>
        <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '32px', md: '42px' } }}>
          Trainer management, client load, and commissions
        </Typography>
        <Typography color="text.secondary" maxWidth="920px">
          Use this workspace to track assigned members, log shift handoff notes, review coached sessions,
          and manage staff compensation. Admins can assign members and maintain payout rules, while staff members
          can keep their own daily operating notes in one place.
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button
            component={RouterLink}
            to={PATHS.staff}
            variant="outlined"
            sx={{ borderRadius: 999, alignSelf: 'flex-start' }}
          >
            Back to staff home
          </Button>
          <Button
            onClick={handleRefresh}
            variant="contained"
            startIcon={<Refresh />}
            disabled={refreshing}
            sx={{ bgcolor: '#ff2625', borderRadius: 999, alignSelf: 'flex-start', '&:hover': { bgcolor: '#df1d1d' } }}
          >
            Refresh workspace
          </Button>
        </Stack>
      </Stack>

      {feedback.message ? (
        <Alert severity={feedback.type || 'info'} sx={{ mb: 3, borderRadius: 3 }}>
          {feedback.message}
        </Alert>
      ) : null}

      {isAdmin ? (
        <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', mb: 3 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
            <TextField
              select
              label="Staff member"
              value={selectedStaffId}
              onChange={(event) => setSelectedStaffId(event.target.value)}
              sx={{ minWidth: { md: 320 } }}
            >
              {staffDirectory.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.full_name || item.email}
                </MenuItem>
              ))}
            </TextField>
            <Typography color="text.secondary">
              Admins can switch between staff accounts here to manage client assignments, compensation rules, and reports.
            </Typography>
          </Stack>
        </Paper>
      ) : null}

      {!targetStaffId ? (
        <EmptyStateCard
          title="Choose a staff member to continue"
          description="Once a staff profile is selected, this workspace will load assignments, shift reports, and compensation data."
        />
      ) : (
        <>
          <Grid container spacing={3} mb={1}>
            <Grid item xs={12} sm={6} xl={3}>
              <MetricCard
                title="Active clients"
                value={stats.activeAssignments}
                caption="Current active member assignments"
                icon={AssignmentInd}
              />
            </Grid>
            <Grid item xs={12} sm={6} xl={3}>
              <MetricCard
                title="Upcoming coached sessions"
                value={stats.upcomingSessions}
                caption="Scheduled future class sessions"
                icon={CalendarMonth}
              />
            </Grid>
            <Grid item xs={12} sm={6} xl={3}>
              <MetricCard
                title="Pending commission"
                value={formatCurrency(stats.pendingCommissionTotal)}
                caption="Pending + approved entries"
                icon={MonetizationOn}
              />
            </Grid>
            <Grid item xs={12} sm={6} xl={3}>
              <MetricCard
                title="Paid this month"
                value={formatCurrency(stats.paidThisMonth)}
                caption={`${stats.flaggedShiftReports} report(s) flagged`}
                icon={Paid}
              />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
                <Stack spacing={2.5}>
                  <Stack spacing={0.5}>
                    <Typography variant="h5" fontWeight={800}>
                      Client assignments
                    </Typography>
                    <Typography color="text.secondary">
                      {selectedStaff?.full_name || selectedStaff?.email || 'Selected staff member'} can use this list
                      to see current coaching relationships, ownership, and handoff notes.
                    </Typography>
                  </Stack>

                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <TextField
                      select
                      label="Assignment status"
                      value={assignmentStatusFilter}
                      onChange={(event) => setAssignmentStatusFilter(event.target.value)}
                      sx={{ minWidth: { md: 220 } }}
                    >
                      {STAFF_ASSIGNMENT_STATUS_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>

                  {isAdmin ? (
                    <>
                      <Divider />
                      <Box component="form" onSubmit={handleSaveAssignment}>
                        <Stack spacing={2}>
                          <Typography variant="h6" fontWeight={700}>
                            Assign a member to this staff account
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                              <TextField
                                select
                                label="Member"
                                value={assignmentForm.member_id}
                                onChange={(event) => setAssignmentForm((currentValue) => ({
                                  ...currentValue,
                                  staff_id: targetStaffId,
                                  member_id: event.target.value,
                                }))}
                                required
                                fullWidth
                              >
                                {memberOptions.map((item) => (
                                  <MenuItem key={item.id} value={item.id}>
                                    {item.full_name || item.email}
                                  </MenuItem>
                                ))}
                              </TextField>
                            </Grid>
                            <Grid item xs={12} md={3}>
                              <TextField
                                select
                                label="Role"
                                value={assignmentForm.assignment_role}
                                onChange={(event) => setAssignmentForm((currentValue) => ({
                                  ...currentValue,
                                  assignment_role: event.target.value,
                                }))}
                                fullWidth
                              >
                                {STAFF_ASSIGNMENT_ROLE_OPTIONS.map((option) => (
                                  <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                  </MenuItem>
                                ))}
                              </TextField>
                            </Grid>
                            <Grid item xs={12} md={3}>
                              <TextField
                                type="date"
                                label="Starts on"
                                value={assignmentForm.starts_on}
                                onChange={(event) => setAssignmentForm((currentValue) => ({
                                  ...currentValue,
                                  starts_on: event.target.value,
                                }))}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                              />
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <TextField
                                label="Focus area"
                                value={assignmentForm.focus_area}
                                onChange={(event) => setAssignmentForm((currentValue) => ({
                                  ...currentValue,
                                  focus_area: event.target.value,
                                }))}
                                placeholder="Fat loss, mobility, onboarding..."
                                fullWidth
                              />
                            </Grid>
                            <Grid item xs={12} md={8}>
                              <TextField
                                label="Notes"
                                value={assignmentForm.notes}
                                onChange={(event) => setAssignmentForm((currentValue) => ({
                                  ...currentValue,
                                  notes: event.target.value,
                                }))}
                                placeholder="Scope, communication notes, or handoff context"
                                fullWidth
                              />
                            </Grid>
                          </Grid>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                            <Button
                              type="submit"
                              variant="contained"
                              startIcon={<SaveOutlined />}
                              disabled={savingAssignment || !assignmentForm.member_id}
                              sx={{ bgcolor: '#ff2625', borderRadius: 999, '&:hover': { bgcolor: '#df1d1d' } }}
                            >
                              Save assignment
                            </Button>
                            <Button
                              type="button"
                              variant="outlined"
                              disabled={savingAssignment}
                              onClick={() => setAssignmentForm(createEmptyAssignmentForm(targetStaffId))}
                              sx={{ borderRadius: 999 }}
                            >
                              Clear form
                            </Button>
                          </Stack>
                        </Stack>
                      </Box>
                    </>
                  ) : null}

                  <Divider />

                  {sortedAssignments.length ? (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Member</TableCell>
                            <TableCell>Role</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Focus</TableCell>
                            <TableCell>Starts</TableCell>
                            <TableCell>Ends</TableCell>
                            <TableCell>Notes</TableCell>
                            {isAdmin ? <TableCell align="right">Action</TableCell> : null}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sortedAssignments.map((assignment) => (
                            <TableRow key={assignment.id} hover>
                              <TableCell>
                                <Stack spacing={0.25}>
                                  <Typography fontWeight={700}>
                                    {assignment.member?.full_name || assignment.member?.email || 'Member'}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {assignment.member?.email || assignment.member?.phone || 'No contact on file'}
                                  </Typography>
                                </Stack>
                              </TableCell>
                              <TableCell sx={{ textTransform: 'capitalize' }}>
                                {assignment.assignment_role?.replaceAll('_', ' ')}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={getAssignmentStatusLabel(assignment.status)}
                                  sx={getAssignmentStatusChipSx(assignment.status)}
                                />
                              </TableCell>
                              <TableCell>{assignment.focus_area || '—'}</TableCell>
                              <TableCell>{formatStaffDate(assignment.starts_on)}</TableCell>
                              <TableCell>{formatStaffDate(assignment.ends_on)}</TableCell>
                              <TableCell sx={{ maxWidth: 240 }}>{assignment.notes || '—'}</TableCell>
                              {isAdmin ? (
                                <TableCell align="right">
                                  {assignment.status === 'active' ? (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      disabled={actingAssignmentId === assignment.id}
                                      onClick={() => handleCloseAssignment(assignment.id)}
                                      sx={{ borderRadius: 999, textTransform: 'none' }}
                                    >
                                      Close
                                    </Button>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">
                                      Closed
                                    </Typography>
                                  )}
                                </TableCell>
                              ) : null}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <EmptyStateCard
                      title="No client assignments yet"
                      description="Once members are assigned to this staff account, they will appear here with role and handoff context."
                    />
                  )}
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} lg={4}>
              <Stack spacing={3}>
                <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
                  <Box component="form" onSubmit={handleSaveCompensation}>
                    <Stack spacing={2}>
                      <Stack spacing={0.5}>
                        <Typography variant="h5" fontWeight={800}>
                          Compensation profile
                        </Typography>
                        <Typography color="text.secondary">
                          Keep the payout rules for this staff member in one place.
                        </Typography>
                      </Stack>

                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            type="number"
                            label="Monthly retainer"
                            value={compensationForm.monthly_retainer}
                            onChange={(event) => setCompensationForm((currentValue) => ({
                              ...currentValue,
                              monthly_retainer: event.target.value,
                            }))}
                            fullWidth
                            disabled={!isAdmin}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            type="number"
                            label="Per-session bonus"
                            value={compensationForm.per_session_bonus}
                            onChange={(event) => setCompensationForm((currentValue) => ({
                              ...currentValue,
                              per_session_bonus: event.target.value,
                            }))}
                            fullWidth
                            disabled={!isAdmin}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            type="number"
                            label="Membership commission %"
                            value={compensationForm.commission_rate_membership}
                            onChange={(event) => setCompensationForm((currentValue) => ({
                              ...currentValue,
                              commission_rate_membership: event.target.value,
                            }))}
                            fullWidth
                            disabled={!isAdmin}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            type="number"
                            label="PT commission %"
                            value={compensationForm.commission_rate_pt}
                            onChange={(event) => setCompensationForm((currentValue) => ({
                              ...currentValue,
                              commission_rate_pt: event.target.value,
                            }))}
                            fullWidth
                            disabled={!isAdmin}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            select
                            label="Payout cycle"
                            value={compensationForm.payout_cycle}
                            onChange={(event) => setCompensationForm((currentValue) => ({
                              ...currentValue,
                              payout_cycle: event.target.value,
                            }))}
                            fullWidth
                            disabled={!isAdmin}
                          >
                            {STAFF_PAYOUT_CYCLE_OPTIONS.map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            label="Notes"
                            value={compensationForm.notes}
                            onChange={(event) => setCompensationForm((currentValue) => ({
                              ...currentValue,
                              notes: event.target.value,
                            }))}
                            multiline
                            minRows={3}
                            fullWidth
                            disabled={!isAdmin}
                          />
                        </Grid>
                      </Grid>

                      {isAdmin ? (
                        <Stack direction="row" spacing={1.5}>
                          <Button
                            type="submit"
                            variant="contained"
                            startIcon={<SaveOutlined />}
                            disabled={savingCompensation}
                            sx={{ bgcolor: '#ff2625', borderRadius: 999, '&:hover': { bgcolor: '#df1d1d' } }}
                          >
                            Save compensation
                          </Button>
                          <Button
                            type="button"
                            variant="outlined"
                            disabled={savingCompensation}
                            onClick={() => setCompensationForm(normaliseCompensationForm(compensationProfile, targetStaffId))}
                            sx={{ borderRadius: 999 }}
                          >
                            Reset
                          </Button>
                        </Stack>
                      ) : (
                        <Chip
                          label={`Payout cycle: ${compensationForm.payout_cycle || 'monthly'}`}
                          sx={{ alignSelf: 'flex-start', bgcolor: '#fff0f0', color: '#ff2625', fontWeight: 700 }}
                        />
                      )}
                    </Stack>
                  </Box>
                </Paper>

                <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
                  <Stack spacing={2}>
                    <Stack spacing={0.5}>
                      <Typography variant="h5" fontWeight={800}>
                        Upcoming coached sessions
                      </Typography>
                      <Typography color="text.secondary">
                        Upcoming class sessions where this staff account is the trainer.
                      </Typography>
                    </Stack>

                    {upcomingSessions.length ? (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Session</TableCell>
                              <TableCell>Time</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {upcomingSessions.map((session) => (
                              <TableRow key={session.id} hover>
                                <TableCell>
                                  <Stack spacing={0.25}>
                                    <Typography fontWeight={700}>{session.title}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {session.room_name || 'Room TBD'} · {session.session_type || 'Class'}
                                    </Typography>
                                  </Stack>
                                </TableCell>
                                <TableCell>{formatStaffDateTime(session.starts_at)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <EmptyStateCard
                        title="No coached sessions scheduled"
                        description="Future class sessions assigned to this trainer will appear here."
                      />
                    )}
                  </Stack>
                </Paper>
              </Stack>
            </Grid>

            <Grid item xs={12} lg={6}>
              <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
                <Stack spacing={2.5}>
                  <Stack spacing={0.5}>
                    <Typography variant="h5" fontWeight={800}>
                      Shift handoff notes
                    </Typography>
                    <Typography color="text.secondary">
                      Keep a searchable operating log for staffing, member issues, and follow-up actions.
                    </Typography>
                  </Stack>

                  <Box component="form" onSubmit={handleSaveShiftReport}>
                    <Stack spacing={2}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                          <TextField
                            type="date"
                            label="Shift date"
                            value={shiftForm.shift_date}
                            onChange={(event) => setShiftForm((currentValue) => ({
                              ...currentValue,
                              shift_date: event.target.value,
                            }))}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            select
                            label="Shift type"
                            value={shiftForm.shift_type}
                            onChange={(event) => setShiftForm((currentValue) => ({
                              ...currentValue,
                              shift_type: event.target.value,
                            }))}
                            fullWidth
                          >
                            {STAFF_SHIFT_TYPE_OPTIONS.map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            type="number"
                            label="Hours worked"
                            value={shiftForm.hours_worked}
                            onChange={(event) => setShiftForm((currentValue) => ({
                              ...currentValue,
                              hours_worked: event.target.value,
                            }))}
                            fullWidth
                          />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <TextField
                            type="number"
                            label="Check-ins helped"
                            value={shiftForm.member_check_ins}
                            onChange={(event) => setShiftForm((currentValue) => ({
                              ...currentValue,
                              member_check_ins: event.target.value,
                            }))}
                            fullWidth
                          />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <TextField
                            type="number"
                            label="PT sessions"
                            value={shiftForm.pt_sessions_completed}
                            onChange={(event) => setShiftForm((currentValue) => ({
                              ...currentValue,
                              pt_sessions_completed: event.target.value,
                            }))}
                            fullWidth
                          />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <TextField
                            type="number"
                            label="Classes coached"
                            value={shiftForm.classes_coached}
                            onChange={(event) => setShiftForm((currentValue) => ({
                              ...currentValue,
                              classes_coached: event.target.value,
                            }))}
                            fullWidth
                          />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <TextField
                            type="number"
                            label="Lead follow-ups"
                            value={shiftForm.lead_follow_ups}
                            onChange={(event) => setShiftForm((currentValue) => ({
                              ...currentValue,
                              lead_follow_ups: event.target.value,
                            }))}
                            fullWidth
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            type="number"
                            label="Energy score (1-10)"
                            value={shiftForm.energy_score}
                            onChange={(event) => setShiftForm((currentValue) => ({
                              ...currentValue,
                              energy_score: event.target.value,
                            }))}
                            fullWidth
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <FormControlLabel
                            control={(
                              <Switch
                                checked={Boolean(shiftForm.needs_manager_review)}
                                onChange={(event) => setShiftForm((currentValue) => ({
                                  ...currentValue,
                                  needs_manager_review: event.target.checked,
                                }))}
                              />
                            )}
                            label="Needs manager review"
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            label="Summary"
                            value={shiftForm.summary}
                            onChange={(event) => setShiftForm((currentValue) => ({
                              ...currentValue,
                              summary: event.target.value,
                            }))}
                            multiline
                            minRows={3}
                            fullWidth
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            label="Follow-up"
                            value={shiftForm.follow_up}
                            onChange={(event) => setShiftForm((currentValue) => ({
                              ...currentValue,
                              follow_up: event.target.value,
                            }))}
                            multiline
                            minRows={2}
                            fullWidth
                          />
                        </Grid>
                      </Grid>

                      <Stack direction="row" spacing={1.5}>
                        <Button
                          type="submit"
                          variant="contained"
                          startIcon={<WorkHistory />}
                          disabled={savingShift}
                          sx={{ bgcolor: '#ff2625', borderRadius: 999, '&:hover': { bgcolor: '#df1d1d' } }}
                        >
                          Save shift report
                        </Button>
                        <Button
                          type="button"
                          variant="outlined"
                          disabled={savingShift}
                          onClick={() => setShiftForm(createEmptyShiftReportForm(targetStaffId))}
                          sx={{ borderRadius: 999 }}
                        >
                          Clear form
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>

                  <Divider />

                  {sortedShiftReports.length ? (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Shift</TableCell>
                            <TableCell>Hours</TableCell>
                            <TableCell>Summary</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sortedShiftReports.map((report) => (
                            <TableRow key={report.id} hover>
                              <TableCell>{formatStaffDate(report.shift_date)}</TableCell>
                              <TableCell>
                                <Stack spacing={0.5}>
                                  <Typography fontWeight={700}>{getShiftTypeLabel(report.shift_type)}</Typography>
                                  {report.needs_manager_review ? (
                                    <Chip
                                      size="small"
                                      label="Review"
                                      sx={{ alignSelf: 'flex-start', bgcolor: '#fff7ed', color: '#c2410c', fontWeight: 700 }}
                                    />
                                  ) : null}
                                </Stack>
                              </TableCell>
                              <TableCell>{formatHours(report.hours_worked)}</TableCell>
                              <TableCell sx={{ maxWidth: 280 }}>
                                <Stack spacing={0.25}>
                                  <Typography variant="body2">{report.summary || 'No summary added.'}</Typography>
                                  {report.follow_up ? (
                                    <Typography variant="body2" color="text.secondary">
                                      Follow-up: {report.follow_up}
                                    </Typography>
                                  ) : null}
                                </Stack>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <EmptyStateCard
                      title="No shift reports yet"
                      description="Daily shift logs will start appearing here as soon as a report is submitted."
                    />
                  )}
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} lg={6}>
              <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
                <Stack spacing={2.5}>
                  <Stack spacing={0.5}>
                    <Typography variant="h5" fontWeight={800}>
                      Commission ledger
                    </Typography>
                    <Typography color="text.secondary">
                      Review pending payouts and keep manual commission adjustments in one ledger.
                    </Typography>
                  </Stack>

                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <TextField
                      select
                      label="Commission status"
                      value={commissionStatusFilter}
                      onChange={(event) => setCommissionStatusFilter(event.target.value)}
                      sx={{ minWidth: { md: 220 } }}
                    >
                      {STAFF_COMMISSION_STATUS_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>

                  {isAdmin ? (
                    <>
                      <Divider />
                      <Box component="form" onSubmit={handleSaveCommissionEntry}>
                        <Stack spacing={2}>
                          <Typography variant="h6" fontWeight={700}>
                            Add commission entry
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={7}>
                              <TextField
                                label="Description"
                                value={commissionEntryForm.description}
                                onChange={(event) => setCommissionEntryForm((currentValue) => ({
                                  ...currentValue,
                                  description: event.target.value,
                                }))}
                                fullWidth
                                required
                              />
                            </Grid>
                            <Grid item xs={12} md={5}>
                              <TextField
                                type="number"
                                label="Amount"
                                value={commissionEntryForm.amount}
                                onChange={(event) => setCommissionEntryForm((currentValue) => ({
                                  ...currentValue,
                                  amount: event.target.value,
                                }))}
                                fullWidth
                                required
                              />
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <TextField
                                select
                                label="Source"
                                value={commissionEntryForm.source_module}
                                onChange={(event) => setCommissionEntryForm((currentValue) => ({
                                  ...currentValue,
                                  source_module: event.target.value,
                                }))}
                                fullWidth
                              >
                                {STAFF_COMMISSION_SOURCE_OPTIONS.map((option) => (
                                  <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                  </MenuItem>
                                ))}
                              </TextField>
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <TextField
                                select
                                label="Status"
                                value={commissionEntryForm.status}
                                onChange={(event) => setCommissionEntryForm((currentValue) => ({
                                  ...currentValue,
                                  status: event.target.value,
                                }))}
                                fullWidth
                              >
                                {STAFF_COMMISSION_STATUS_OPTIONS
                                  .filter((option) => option.value !== 'all')
                                  .map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                      {option.label}
                                    </MenuItem>
                                  ))}
                              </TextField>
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <TextField
                                type="date"
                                label="Earned on"
                                value={commissionEntryForm.earned_on}
                                onChange={(event) => setCommissionEntryForm((currentValue) => ({
                                  ...currentValue,
                                  earned_on: event.target.value,
                                }))}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                              />
                            </Grid>
                            <Grid item xs={12}>
                              <TextField
                                label="Notes"
                                value={commissionEntryForm.notes}
                                onChange={(event) => setCommissionEntryForm((currentValue) => ({
                                  ...currentValue,
                                  notes: event.target.value,
                                }))}
                                fullWidth
                              />
                            </Grid>
                          </Grid>
                          <Stack direction="row" spacing={1.5}>
                            <Button
                              type="submit"
                              variant="contained"
                              startIcon={<SaveOutlined />}
                              disabled={savingCommission}
                              sx={{ bgcolor: '#ff2625', borderRadius: 999, '&:hover': { bgcolor: '#df1d1d' } }}
                            >
                              Save commission
                            </Button>
                            <Button
                              type="button"
                              variant="outlined"
                              disabled={savingCommission}
                              onClick={() => setCommissionEntryForm(createEmptyCommissionEntryForm(targetStaffId))}
                              sx={{ borderRadius: 999 }}
                            >
                              Clear form
                            </Button>
                          </Stack>
                        </Stack>
                      </Box>
                    </>
                  ) : null}

                  <Divider />

                  {sortedCommissionEntries.length ? (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Earned on</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Amount</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sortedCommissionEntries.map((entry) => (
                            <TableRow key={entry.id} hover>
                              <TableCell>{formatStaffDate(entry.earned_on)}</TableCell>
                              <TableCell>
                                <Stack spacing={0.25}>
                                  <Typography fontWeight={700}>{entry.description}</Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {entry.source_module || 'manual'}
                                    {entry.payout_due_on ? ` · Due ${formatStaffDate(entry.payout_due_on)}` : ''}
                                  </Typography>
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={getCommissionStatusLabel(entry.status)}
                                  sx={getCommissionStatusChipSx(entry.status)}
                                />
                              </TableCell>
                              <TableCell align="right">
                                {formatCurrency(entry.amount, entry.currency_code)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <EmptyStateCard
                      title="No commission entries yet"
                      description="Manual or automated commission rows will appear here once they are recorded."
                    />
                  )}
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default StaffToolsPage;
