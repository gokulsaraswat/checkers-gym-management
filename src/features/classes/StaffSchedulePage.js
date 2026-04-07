import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
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
  CalendarMonth,
  EditOutlined,
  EventBusy,
  EventRepeat,
  Groups2,
  Refresh,
  SaveOutlined,
  TaskAlt,
} from '@mui/icons-material';

import EmptyStateCard from '../../components/common/EmptyStateCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import MetricCard from '../../components/common/MetricCard';
import SetupNotice from '../../components/common/SetupNotice';
import { useAuth } from '../../context/AuthContext';
import {
  fetchClassSessions,
  fetchScheduleTrainers,
  saveClassSession,
  updateClassSessionStatus,
} from '../../services/gymService';
import {
  buildClassScheduleStats,
  buildRoomOptions,
  buildTrainerOptions,
  createEmptySessionForm,
  createScheduleFilters,
  formatSessionTimeRange,
  getSessionStatusChipSx,
  getSessionStatusLabel,
  getSessionTypeLabel,
  getVisibilityChipSx,
  getVisibilityLabel,
  normaliseTrainerLabel,
  SESSION_STATUS_OPTIONS,
  SESSION_TYPE_OPTIONS,
  SESSION_VISIBILITY_OPTIONS,
  toSessionForm,
} from './classScheduleHelpers';

const StaffSchedulePage = () => {
  const { loading, profile, isConfigured } = useAuth();

  const [filters, setFilters] = useState({
    ...createScheduleFilters(),
    status: 'all',
    includeInactive: true,
  });
  const [sessionForm, setSessionForm] = useState(createEmptySessionForm);
  const [sessions, setSessions] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [actingSessionId, setActingSessionId] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const didInitialLoad = useRef(false);

  const loadScheduleAdmin = useCallback(async (showPageLoader = false) => {
    if (!isConfigured) {
      setPageLoading(false);
      return;
    }

    try {
      if (showPageLoader) {
        setPageLoading(true);
      } else {
        setRefreshing(true);
      }

      const [sessionRows, trainerRows] = await Promise.all([
        fetchClassSessions({
          startDate: filters.startDate,
          endDate: filters.endDate,
          sessionType: filters.sessionType,
          trainerId: filters.trainerId,
          roomName: filters.roomName,
          status: filters.status,
          includeInactive: filters.includeInactive,
        }),
        fetchScheduleTrainers(),
      ]);

      setSessions(sessionRows);
      setTrainers(trainerRows);
      setFeedback((current) => (current.type === 'error' ? { type: '', message: '' } : current));
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to load schedule operations.',
      });
    } finally {
      setPageLoading(false);
      setRefreshing(false);
    }
  }, [filters.endDate, filters.includeInactive, filters.roomName, filters.sessionType, filters.startDate, filters.status, filters.trainerId, isConfigured]);

  useEffect(() => {
    if (!didInitialLoad.current) {
      didInitialLoad.current = true;
      loadScheduleAdmin(true);
      return;
    }

    loadScheduleAdmin();
  }, [filters, loadScheduleAdmin]);

  const stats = useMemo(
    () => buildClassScheduleStats(sessions),
    [sessions],
  );

  const roomOptions = useMemo(
    () => buildRoomOptions(sessions),
    [sessions],
  );

  const trainerOptions = useMemo(
    () => buildTrainerOptions(sessions, trainers),
    [sessions, trainers],
  );

  const handleFilterChange = (key) => (event) => {
    const nextValue = key === 'includeInactive' ? event.target.checked : event.target.value;

    setFilters((current) => ({
      ...current,
      [key]: nextValue,
    }));
  };

  const handleFormChange = (key) => (event) => {
    const nextValue = key === 'isActive' ? event.target.checked : event.target.value;

    setSessionForm((current) => ({
      ...current,
      [key]: nextValue,
      ...(key === 'trainerId' ? {
        trainerName: trainerOptions.find((trainer) => trainer.value === nextValue)?.label || '',
      } : {}),
    }));
  };

  const resetForm = () => {
    setSessionForm(createEmptySessionForm());
  };

  const handleEdit = (session) => {
    setSessionForm(toSessionForm(session));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveSession = async (event) => {
    event.preventDefault();

    try {
      setSavingSession(true);
      setFeedback({ type: '', message: '' });

      const savedRows = await saveClassSession(sessionForm);

      resetForm();
      await loadScheduleAdmin();
      setFeedback({
        type: 'success',
        message: sessionForm.id
          ? 'Class session updated successfully.'
          : `${savedRows.length} class session${savedRows.length === 1 ? '' : 's'} scheduled successfully.`,
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to save the class session.',
      });
    } finally {
      setSavingSession(false);
    }
  };

  const handleQuickStatus = async (session, status) => {
    try {
      setActingSessionId(session.id);
      setFeedback({ type: '', message: '' });

      await updateClassSessionStatus(session.id, {
        scheduleStatus: status,
        isActive: status === 'scheduled',
      });

      await loadScheduleAdmin();
      setFeedback({
        type: 'success',
        message: `${session.title} marked as ${getSessionStatusLabel(status).toLowerCase()}.`,
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || `Unable to update ${session.title}.`,
      });
    } finally {
      setActingSessionId('');
    }
  };

  if (loading || pageLoading) {
    return <LoadingScreen message="Loading schedule operations..." />;
  }

  return (
    <Box sx={{ py: { xs: 3, md: 5 } }}>
      <SetupNotice title="Schedule management needs Supabase setup" />

      <Stack spacing={1.5} mb={4}>
        <Typography color="#ff2625" fontWeight={700}>
          Staff schedule operations
        </Typography>
        <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '32px', md: '42px' } }}>
          Build the weekly timetable, assign trainers, and manage room usage
        </Typography>
        <Typography color="text.secondary" maxWidth="900px">
          Staff and admin accounts can publish live classes, PT blocks, assessments, and events here.
          Repeat weekly sessions to build a timetable faster, then use quick actions to cancel, complete,
          or restore a session without leaving the workspace.
        </Typography>
      </Stack>

      {feedback.message ? (
        <Alert severity={feedback.type || 'info'} sx={{ mb: 3, borderRadius: 3 }}>
          {feedback.message}
        </Alert>
      ) : null}

      {!profile?.is_active ? (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 3 }}>
          Your own staff access is paused. Another admin must reactivate your profile before schedule changes will succeed.
        </Alert>
      ) : null}

      <Grid container spacing={3} mb={1}>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Upcoming"
            value={stats.upcoming}
            caption={`${stats.scheduled} scheduled in range`}
            icon={CalendarMonth}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Cancelled"
            value={stats.cancelled}
            caption="Sessions that need follow-up"
            icon={EventBusy}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Trainers"
            value={stats.uniqueTrainers}
            caption="Active coaches on the board"
            icon={Groups2}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Rooms used"
            value={stats.roomsInUse}
            caption="Distinct rooms or zones"
            icon={EventRepeat}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} xl={5}>
          <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
            <Stack spacing={2.5} component="form" onSubmit={handleSaveSession}>
              <Stack spacing={0.5}>
                <Typography variant="h5" fontWeight={800}>
                  {sessionForm.id ? 'Edit class session' : 'Create class session'}
                </Typography>
                <Typography color="text.secondary">
                  Use one form for group classes, PT slots, onboarding assessments, or one-off gym events.
                </Typography>
              </Stack>

              <Grid container spacing={2}>
                <Grid item xs={12} md={7}>
                  <TextField
                    label="Title"
                    value={sessionForm.title}
                    onChange={handleFormChange('title')}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={12} md={5}>
                  <TextField
                    select
                    label="Session type"
                    value={sessionForm.sessionType}
                    onChange={handleFormChange('sessionType')}
                    fullWidth
                  >
                    {SESSION_TYPE_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Description"
                    value={sessionForm.description}
                    onChange={handleFormChange('description')}
                    fullWidth
                    multiline
                    minRows={2}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    label="Assigned trainer"
                    value={sessionForm.trainerId}
                    onChange={handleFormChange('trainerId')}
                    fullWidth
                  >
                    <MenuItem value="">Assign later</MenuItem>
                    {trainerOptions.map((trainer) => (
                      <MenuItem key={trainer.value} value={trainer.value}>
                        {trainer.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Room / area"
                    value={sessionForm.roomName}
                    onChange={handleFormChange('roomName')}
                    fullWidth
                    placeholder="Studio A, Turf, Main floor"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Branch"
                    value={sessionForm.branchName}
                    onChange={handleFormChange('branchName')}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Capacity"
                    type="number"
                    value={sessionForm.capacity}
                    onChange={handleFormChange('capacity')}
                    fullWidth
                    inputProps={{ min: 1 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Starts at"
                    type="datetime-local"
                    value={sessionForm.startsAt}
                    onChange={handleFormChange('startsAt')}
                    fullWidth
                    required
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Ends at"
                    type="datetime-local"
                    value={sessionForm.endsAt}
                    onChange={handleFormChange('endsAt')}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    label="Visibility"
                    value={sessionForm.visibility}
                    onChange={handleFormChange('visibility')}
                    fullWidth
                  >
                    {SESSION_VISIBILITY_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    label="Status"
                    value={sessionForm.scheduleStatus}
                    onChange={handleFormChange('scheduleStatus')}
                    fullWidth
                  >
                    {SESSION_STATUS_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={8}>
                  <TextField
                    label="Equipment or setup notes"
                    value={sessionForm.equipmentNotes}
                    onChange={handleFormChange('equipmentNotes')}
                    fullWidth
                    placeholder="3 benches, 12 kettlebells, projector, mobility mats"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Repeat weekly"
                    type="number"
                    value={sessionForm.repeatWeeks}
                    onChange={handleFormChange('repeatWeeks')}
                    fullWidth
                    inputProps={{ min: 0, max: 12 }}
                    helperText="0 = this session only"
                    disabled={Boolean(sessionForm.id)}
                  />
                </Grid>
              </Grid>

              <FormControlLabel
                control={(
                  <Switch
                    checked={Boolean(sessionForm.isActive)}
                    onChange={handleFormChange('isActive')}
                  />
                )}
                label="Session is active and should appear on schedule"
              />

              {sessionForm.id ? (
                <Alert severity="info" sx={{ borderRadius: 3 }}>
                  Repeat weekly is disabled while editing. To change a recurring series, update each session you need or create a new sequence.
                </Alert>
              ) : null}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SaveOutlined />}
                  disabled={savingSession}
                  sx={{ bgcolor: '#ff2625', borderRadius: 999, '&:hover': { bgcolor: '#df1d1d' } }}
                >
                  {(() => {
                    if (savingSession) return 'Saving...';
                    return sessionForm.id ? 'Update session' : 'Publish session';
                  })()}
                </Button>
                <Button variant="outlined" onClick={resetForm} sx={{ borderRadius: 999 }}>
                  Reset form
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} xl={7}>
          <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', mb: 3 }}>
            <Stack spacing={2.5}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                <Stack spacing={0.5}>
                  <Typography variant="h5" fontWeight={800}>
                    Schedule filters
                  </Typography>
                  <Typography color="text.secondary">
                    Review the timetable by range, trainer, room, or session status.
                  </Typography>
                </Stack>

                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={() => loadScheduleAdmin()}
                  disabled={refreshing}
                  sx={{ borderRadius: 999, alignSelf: 'flex-start' }}
                >
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </Stack>

              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Start date"
                    type="date"
                    value={filters.startDate}
                    onChange={handleFilterChange('startDate')}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="End date"
                    type="date"
                    value={filters.endDate}
                    onChange={handleFilterChange('endDate')}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    select
                    label="Type"
                    value={filters.sessionType}
                    onChange={handleFilterChange('sessionType')}
                    fullWidth
                  >
                    <MenuItem value="all">All types</MenuItem>
                    {SESSION_TYPE_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    select
                    label="Trainer"
                    value={filters.trainerId}
                    onChange={handleFilterChange('trainerId')}
                    fullWidth
                  >
                    <MenuItem value="all">All trainers</MenuItem>
                    {trainerOptions.map((trainer) => (
                      <MenuItem key={trainer.value} value={trainer.value}>
                        {trainer.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    select
                    label="Room"
                    value={filters.roomName}
                    onChange={handleFilterChange('roomName')}
                    fullWidth
                  >
                    <MenuItem value="all">All rooms</MenuItem>
                    {roomOptions.map((roomName) => (
                      <MenuItem key={roomName} value={roomName}>
                        {roomName}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    select
                    label="Status"
                    value={filters.status}
                    onChange={handleFilterChange('status')}
                    fullWidth
                  >
                    <MenuItem value="all">All statuses</MenuItem>
                    {SESSION_STATUS_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={8}>
                  <FormControlLabel
                    control={(
                      <Switch
                        checked={Boolean(filters.includeInactive)}
                        onChange={handleFilterChange('includeInactive')}
                      />
                    )}
                    label="Include inactive sessions in results"
                  />
                </Grid>
              </Grid>
            </Stack>
          </Paper>

          {sessions.length ? (
            <TableContainer component={Paper} className="surface-card" sx={{ borderRadius: 4, background: '#fff' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Session</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>When</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Trainer</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Room</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id} hover>
                      <TableCell>
                        <Stack spacing={0.75}>
                          <Typography fontWeight={700}>{session.title}</Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap">
                            <Chip label={getSessionTypeLabel(session.session_type)} size="small" />
                            <Chip
                              label={getVisibilityLabel(session.visibility)}
                              size="small"
                              sx={getVisibilityChipSx(session.visibility)}
                            />
                            {!session.is_active ? (
                              <Chip label="Inactive" size="small" sx={{ fontWeight: 700 }} />
                            ) : null}
                          </Stack>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={700}>
                          {formatSessionTimeRange(session.starts_at, session.ends_at)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {session.starts_at ? new Date(session.starts_at).toLocaleDateString() : 'Date TBD'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={700}>
                          {normaliseTrainerLabel(session)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {session.branch_name || 'Main branch'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={700}>
                          {session.room_name || 'Assigned later'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Capacity {session.capacity || 0}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getSessionStatusLabel(session.schedule_status)}
                          size="small"
                          sx={getSessionStatusChipSx(session.schedule_status)}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditOutlined />}
                            onClick={() => handleEdit(session)}
                            sx={{ borderRadius: 999 }}
                          >
                            Edit
                          </Button>

                          {session.schedule_status !== 'cancelled' ? (
                            <Button
                              size="small"
                              color="warning"
                              variant="outlined"
                              startIcon={<EventBusy />}
                              onClick={() => handleQuickStatus(session, 'cancelled')}
                              disabled={actingSessionId === session.id}
                              sx={{ borderRadius: 999 }}
                            >
                              Cancel
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              color="success"
                              variant="outlined"
                              startIcon={<TaskAlt />}
                              onClick={() => handleQuickStatus(session, 'scheduled')}
                              disabled={actingSessionId === session.id}
                              sx={{ borderRadius: 999 }}
                            >
                              Restore
                            </Button>
                          )}

                          {session.schedule_status !== 'completed' ? (
                            <Button
                              size="small"
                              color="success"
                              variant="outlined"
                              onClick={() => handleQuickStatus(session, 'completed')}
                              disabled={actingSessionId === session.id}
                              sx={{ borderRadius: 999 }}
                            >
                              Complete
                            </Button>
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
              title="No class sessions in the current range"
              description="Use the form to create the first class slot, PT block, or gym event for this period."
            />
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default StaffSchedulePage;
