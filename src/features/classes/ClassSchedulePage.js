import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
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
  CalendarMonth,
  EventAvailable,
  FitnessCenter,
  Groups2,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

import { PATHS } from '../../app/paths';
import EmptyStateCard from '../../components/common/EmptyStateCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import MetricCard from '../../components/common/MetricCard';
import SetupNotice from '../../components/common/SetupNotice';
import { useAuth } from '../../context/AuthContext';
import {
  bookClassSession,
  cancelClassBooking,
  fetchBookableClassSessions,
  fetchScheduleTrainers,
} from '../../services/gymService';
import {
  buildClassScheduleStats,
  buildRoomOptions,
  buildTrainerOptions,
  createScheduleFilters,
  formatSessionTimeRange,
  getSessionStatusChipSx,
  getSessionStatusLabel,
  getSessionTypeLabel,
  getVisibilityChipSx,
  getVisibilityLabel,
  groupClassSessionsByDate,
  normaliseTrainerLabel,
} from './classScheduleHelpers';
import {
  buildScheduleBookingStats,
  describeCapacity,
  getAvailabilityChipSx,
  getAvailabilityMeta,
  getMemberBookingAction,
} from '../bookings/bookingHelpers';

const ClassSchedulePage = () => {
  const { loading, isConfigured } = useAuth();

  const [filters, setFilters] = useState(createScheduleFilters);
  const [sessions, setSessions] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingSessionId, setActingSessionId] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const didInitialLoad = useRef(false);

  const loadSchedule = useCallback(async (showPageLoader = false) => {
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
        fetchBookableClassSessions({
          startDate: filters.startDate,
          endDate: filters.endDate,
          sessionType: filters.sessionType,
          trainerId: filters.trainerId,
          roomName: filters.roomName,
          status: filters.status,
          includeInactive: false,
          visibility: 'members',
        }),
        fetchScheduleTrainers(),
      ]);

      setSessions(sessionRows);
      setTrainers(trainerRows);
      setFeedback((current) => (current.type === 'error' ? { type: '', message: '' } : current));
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to load the class timetable.',
      });
    } finally {
      setPageLoading(false);
      setRefreshing(false);
    }
  }, [filters.endDate, filters.roomName, filters.sessionType, filters.startDate, filters.status, filters.trainerId, isConfigured]);

  useEffect(() => {
    if (!didInitialLoad.current) {
      didInitialLoad.current = true;
      loadSchedule(true);
      return;
    }

    loadSchedule();
  }, [filters, loadSchedule]);

  const stats = useMemo(
    () => buildClassScheduleStats(sessions),
    [sessions],
  );

  const bookingStats = useMemo(
    () => buildScheduleBookingStats(sessions),
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

  const groupedSessions = useMemo(
    () => groupClassSessionsByDate(sessions),
    [sessions],
  );

  const handleFilterChange = (key) => (event) => {
    const nextValue = event.target.value;
    setFilters((current) => ({
      ...current,
      [key]: nextValue,
    }));
  };

  const handleRefresh = async () => {
    await loadSchedule();
  };

  const handleReset = async () => {
    setFilters(createScheduleFilters());
  };

  const handleBookingAction = async (session) => {
    const action = getMemberBookingAction(session);

    if (action.mode === 'closed' || action.disabled) {
      return;
    }

    try {
      setActingSessionId(session.id);
      setFeedback({ type: '', message: '' });

      if (action.mode === 'cancel') {
        await cancelClassBooking(session.id);
        await loadSchedule();
        setFeedback({
          type: 'success',
          message: `${session.title} reservation updated successfully.`,
        });
        return;
      }

      const savedBooking = await bookClassSession(session.id);

      await loadSchedule();
      setFeedback({
        type: 'success',
        message: savedBooking?.booking_status === 'waitlist'
          ? `${session.title} is full, so you have been added to the waitlist.`
          : `${session.title} has been booked successfully.`,
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
    return <LoadingScreen message="Loading class timetable..." />;
  }

  return (
    <Box sx={{ py: { xs: 3, md: 5 } }}>
      <SetupNotice title="Class scheduling needs Supabase setup" />

      <Stack spacing={1.5} mb={4}>
        <Typography color="#ff2625" fontWeight={700}>
          Member timetable
        </Typography>
        <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '32px', md: '42px' } }}>
          Explore the live class schedule and reserve your next session
        </Typography>
        <Typography color="text.secondary" maxWidth="880px">
          Browse upcoming classes, see how full each session is, book your place instantly, or join the
          waitlist when a class fills up.
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
            title="Scheduled sessions"
            value={stats.scheduled}
            caption={`${stats.total} total in current range`}
            icon={CalendarMonth}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="My bookings"
            value={bookingStats.bookedByMe}
            caption={`${bookingStats.waitlistedByMe} waitlisted`}
            icon={EventAvailable}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Open spots"
            value={bookingStats.openSpots}
            caption={`${bookingStats.fullClasses} classes are full`}
            icon={FitnessCenter}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Trainers"
            value={stats.uniqueTrainers}
            caption="Coaches on the timetable"
            icon={Groups2}
          />
        </Grid>
      </Grid>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={3}>
        <Button
          component={RouterLink}
          to={PATHS.bookings}
          variant="contained"
          sx={{ bgcolor: '#ff2625', borderRadius: 999, '&:hover': { bgcolor: '#df1d1d' } }}
        >
          Open my bookings
        </Button>
        <Button
          variant="outlined"
          onClick={handleRefresh}
          disabled={refreshing}
          sx={{ borderRadius: 999 }}
        >
          {refreshing ? 'Refreshing...' : 'Refresh availability'}
        </Button>
      </Stack>

      <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', mb: 3 }}>
        <Stack spacing={2.5}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
            <Stack spacing={0.5}>
              <Typography variant="h5" fontWeight={800}>
                Filter the timetable
              </Typography>
              <Typography color="text.secondary">
                Narrow the next two weeks by class type, trainer, room, or status.
              </Typography>
            </Stack>

            <Button variant="outlined" onClick={handleReset} sx={{ borderRadius: 999, alignSelf: 'flex-start' }}>
              Reset filters
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
                <MenuItem value="all">All session types</MenuItem>
                <MenuItem value="group_class">Group class</MenuItem>
                <MenuItem value="personal_training">Personal training</MenuItem>
                <MenuItem value="assessment">Assessment</MenuItem>
                <MenuItem value="event">Event</MenuItem>
                <MenuItem value="open_gym">Open gym block</MenuItem>
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
          </Grid>
        </Stack>
      </Paper>

      {groupedSessions.length ? (
        <Stack spacing={3}>
          {groupedSessions.map((group) => (
            <Paper
              key={group.dateKey}
              className="surface-card"
              sx={{ p: 3, borderRadius: 4, background: '#fff' }}
            >
              <Stack spacing={2.5}>
                <Stack spacing={0.5}>
                  <Typography variant="h5" fontWeight={800}>
                    {group.label}
                  </Typography>
                  <Typography color="text.secondary">
                    {group.rows.length} session{group.rows.length === 1 ? '' : 's'} on this day.
                  </Typography>
                </Stack>

                <Divider />

                <Stack spacing={2}>
                  {group.rows.map((session) => {
                    const action = getMemberBookingAction(session);
                    const availability = getAvailabilityMeta(session);

                    return (
                      <Paper
                        key={session.id}
                        variant="outlined"
                        sx={{ borderRadius: 4, p: 2.5, borderColor: '#f0dada', background: '#fffafa' }}
                      >
                        <Stack spacing={1.75}>
                          <Stack
                            direction={{ xs: 'column', md: 'row' }}
                            justifyContent="space-between"
                            spacing={2}
                          >
                            <Stack spacing={0.75}>
                              <Typography variant="h6" fontWeight={800}>
                                {session.title}
                              </Typography>
                              <Stack direction="row" spacing={1} flexWrap="wrap">
                                <Chip label={getSessionTypeLabel(session.session_type)} sx={{ fontWeight: 700 }} />
                                <Chip
                                  label={getSessionStatusLabel(session.schedule_status)}
                                  sx={getSessionStatusChipSx(session.schedule_status)}
                                />
                                <Chip
                                  label={getVisibilityLabel(session.visibility)}
                                  sx={getVisibilityChipSx(session.visibility)}
                                />
                                <Chip
                                  label={availability.label}
                                  sx={getAvailabilityChipSx(session)}
                                />
                              </Stack>
                            </Stack>

                            <Stack spacing={0.5} alignItems={{ xs: 'flex-start', md: 'flex-end' }}>
                              <Typography fontWeight={700}>
                                {formatSessionTimeRange(session.starts_at, session.ends_at)}
                              </Typography>
                              <Typography color="text.secondary">
                                {describeCapacity(session)}
                              </Typography>
                            </Stack>
                          </Stack>

                          <Typography color="text.secondary">
                            {session.description || 'No class description has been added yet.'}
                          </Typography>

                          <Grid container spacing={2}>
                            <Grid item xs={12} md={3}>
                              <Typography color="text.secondary" variant="body2">
                                Trainer
                              </Typography>
                              <Typography fontWeight={700}>
                                {normaliseTrainerLabel(session)}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} md={3}>
                              <Typography color="text.secondary" variant="body2">
                                Room
                              </Typography>
                              <Typography fontWeight={700}>
                                {session.room_name || 'Assigned later'}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} md={3}>
                              <Typography color="text.secondary" variant="body2">
                                Branch
                              </Typography>
                              <Typography fontWeight={700}>
                                {session.branch_name || 'Main branch'}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} md={3}>
                              <Typography color="text.secondary" variant="body2">
                                Equipment
                              </Typography>
                              <Typography fontWeight={700}>
                                {session.equipment_notes || 'Standard studio setup'}
                              </Typography>
                            </Grid>
                          </Grid>

                          {session.my_booking_status === 'waitlist' && session.my_waitlist_position ? (
                            <Alert severity="info" sx={{ borderRadius: 3 }}>
                              You are currently #{session.my_waitlist_position} on the waitlist for this class.
                            </Alert>
                          ) : null}

                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between">
                            <Alert severity="info" sx={{ borderRadius: 3, flex: 1 }}>
                              {action.mode === 'waitlist'
                                ? 'This class is currently full, but you can still join the waitlist.'
                                : 'Your booking status updates instantly and syncs to the dashboard and bookings page.'}
                            </Alert>

                            <Button
                              variant={action.variant}
                              disabled={action.disabled || actingSessionId === session.id}
                              onClick={() => handleBookingAction(session)}
                              sx={action.variant === 'contained'
                                ? { bgcolor: '#ff2625', borderRadius: 999, minWidth: 170, '&:hover': { bgcolor: '#df1d1d' } }
                                : { borderRadius: 999, minWidth: 170 }}
                            >
                              {actingSessionId === session.id ? 'Updating...' : action.label}
                            </Button>
                          </Stack>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      ) : (
        <EmptyStateCard
          title="No sessions match the current filters"
          description="Try expanding the date range or resetting the filters. Once staff publish sessions, they will appear here automatically."
        />
      )}
    </Box>
  );
};

export default ClassSchedulePage;
