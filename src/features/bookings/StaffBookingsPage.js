import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  MenuItem,
  Paper,
  Stack,
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
  EventAvailable,
  GroupAdd,
  Groups2,
  PlaylistAddCheck,
  Refresh,
} from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';

import EmptyStateCard from '../../components/common/EmptyStateCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import MetricCard from '../../components/common/MetricCard';
import SetupNotice from '../../components/common/SetupNotice';
import { useAuth } from '../../context/AuthContext';
import {
  fetchBookableClassSessions,
  fetchSessionBookingRoster,
  staffPromoteNextWaitlistedBooking,
  staffUpdateClassBooking,
} from '../../services/gymService';
import { formatSessionTimeRange, todayIsoDate, addDaysIso } from '../classes/classScheduleHelpers';
import {
  buildRosterStats,
  describeCapacity,
  formatWaitlistLabel,
  getBookingStatusChipSx,
  getBookingStatusLabel,
} from './bookingHelpers';

const createFilters = () => {
  const startDate = todayIsoDate();

  return {
    startDate,
    endDate: addDaysIso(startDate, 13),
    sessionType: 'all',
    status: 'scheduled',
  };
};

const StaffBookingsPage = () => {
  const { loading, profile, isConfigured } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState(createFilters);
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(searchParams.get('sessionId') || '');
  const [roster, setRoster] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [actingKey, setActingKey] = useState('');

  const syncSelection = useCallback((nextSessions, preferredSessionId) => {
    if (!nextSessions.length) {
      setSelectedSessionId('');
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('sessionId');
      setSearchParams(nextParams, { replace: true });
      return '';
    }

    const hasPreferred = preferredSessionId && nextSessions.some((session) => session.id === preferredSessionId);
    const nextId = hasPreferred ? preferredSessionId : nextSessions[0].id;

    setSelectedSessionId(nextId);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('sessionId', nextId);
    setSearchParams(nextParams, { replace: true });

    return nextId;
  }, [searchParams, setSearchParams]);

  const loadPage = useCallback(async (showPageLoader = false) => {
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

      const sessionRows = await fetchBookableClassSessions({
        startDate: filters.startDate,
        endDate: filters.endDate,
        sessionType: filters.sessionType,
        status: filters.status,
        includeInactive: true,
        visibility: 'all',
        limit: 80,
      });

      const nextSelectedId = syncSelection(sessionRows, selectedSessionId || searchParams.get('sessionId') || '');
      setSessions(sessionRows);

      if (!nextSelectedId) {
        setRoster([]);
        setFeedback((current) => (current.type === 'error' ? { type: '', message: '' } : current));
        return;
      }

      const rosterRows = await fetchSessionBookingRoster(nextSelectedId);
      setRoster(rosterRows);
      setFeedback((current) => (current.type === 'error' ? { type: '', message: '' } : current));
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to load booking operations.',
      });
    } finally {
      setPageLoading(false);
      setRefreshing(false);
    }
  }, [filters.endDate, filters.sessionType, filters.startDate, filters.status, isConfigured, searchParams, selectedSessionId, syncSelection]);

  useEffect(() => {
    loadPage(true);
  }, [loadPage]);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) || null,
    [selectedSessionId, sessions],
  );

  const stats = useMemo(
    () => buildRosterStats(roster),
    [roster],
  );

  const handleFilterChange = (key) => (event) => {
    setFilters((current) => ({
      ...current,
      [key]: event.target.value,
    }));
  };

  const handleSelectSession = async (event) => {
    const nextId = event.target.value;
    setSelectedSessionId(nextId);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('sessionId', nextId);
    setSearchParams(nextParams, { replace: true });

    try {
      setRefreshing(true);
      const rosterRows = await fetchSessionBookingRoster(nextId);
      setRoster(rosterRows);
      setFeedback({ type: '', message: '' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to load the booking roster.',
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handlePromoteNext = async () => {
    if (!selectedSession) {
      return;
    }

    try {
      setActingKey(`promote-${selectedSession.id}`);
      const promoted = await staffPromoteNextWaitlistedBooking(selectedSession.id);
      await loadPage();
      setFeedback({
        type: 'success',
        message: promoted?.user_full_name
          ? `${promoted.user_full_name} has been promoted into a booked spot.`
          : 'The next waitlisted member has been promoted.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to promote the next waitlisted member.',
      });
    } finally {
      setActingKey('');
    }
  };

  const handleUpdateBooking = async (bookingId, bookingStatus, options = {}) => {
    try {
      setActingKey(`${bookingId}:${bookingStatus}`);
      await staffUpdateClassBooking(bookingId, {
        bookingStatus,
        notes: options.notes || null,
        cancelReason: options.cancelReason || null,
      });
      await loadPage();
      setFeedback({
        type: 'success',
        message: 'Booking updated successfully.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to update the booking.',
      });
    } finally {
      setActingKey('');
    }
  };

  if (loading || pageLoading) {
    return <LoadingScreen message="Loading booking operations..." />;
  }

  return (
    <Box sx={{ py: { xs: 3, md: 5 } }}>
      <SetupNotice title="Booking operations need Supabase setup" />

      <Stack spacing={1.5} mb={4}>
        <Typography color="#ff2625" fontWeight={700}>
          Staff booking desk
        </Typography>
        <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '32px', md: '42px' } }}>
          Review class rosters, promote waitlists, and record outcomes
        </Typography>
        <Typography color="text.secondary" maxWidth="900px">
          Staff and admin accounts can monitor seat fill, manage waitlists, and mark booking outcomes without
          opening the admin member detail screen for each person.
        </Typography>
      </Stack>

      {feedback.message ? (
        <Alert severity={feedback.type || 'info'} sx={{ mb: 3, borderRadius: 3 }}>
          {feedback.message}
        </Alert>
      ) : null}

      {profile && !profile.is_active ? (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 3 }}>
          Your own staff access is paused. Another admin must reactivate it before booking actions will succeed.
        </Alert>
      ) : null}

      <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', mb: 3 }}>
        <Stack spacing={2.5}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
            <Stack spacing={0.5}>
              <Typography variant="h5" fontWeight={800}>
                Find a class roster
              </Typography>
              <Typography color="text.secondary">
                Pick a class session to inspect who is booked, who is waiting, and who needs a manual status update.
              </Typography>
            </Stack>

            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => loadPage()}
              disabled={refreshing}
              sx={{ borderRadius: 999, alignSelf: 'flex-start' }}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </Stack>

          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                type="date"
                label="Start date"
                value={filters.startDate}
                onChange={handleFilterChange('startDate')}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                type="date"
                label="End date"
                value={filters.endDate}
                onChange={handleFilterChange('endDate')}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                label="Session type"
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
            <Grid item xs={12} md={3}>
              <TextField
                select
                label="Status"
                value={filters.status}
                onChange={handleFilterChange('status')}
                fullWidth
              >
                <MenuItem value="all">All statuses</MenuItem>
                <MenuItem value="scheduled">Scheduled</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <TextField
                select
                label="Class session"
                value={selectedSessionId}
                onChange={handleSelectSession}
                fullWidth
                helperText={sessions.length ? `${sessions.length} session${sessions.length === 1 ? '' : 's'} found in the current range.` : 'No sessions found in the current range.'}
              >
                {sessions.map((session) => (
                  <MenuItem key={session.id} value={session.id}>
                    {session.title} — {formatSessionTimeRange(session.starts_at, session.ends_at)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </Stack>
      </Paper>

      {selectedSession ? (
        <>
          <Grid container spacing={3} mb={1}>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricCard
                title="Booked"
                value={stats.bookedCount}
                caption={describeCapacity(selectedSession)}
                icon={PlaylistAddCheck}
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricCard
                title="Waitlist"
                value={stats.waitlistCount}
                caption="Members waiting for a vacancy"
                icon={GroupAdd}
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricCard
                title="Attended"
                value={stats.attendedCount}
                caption="Marked complete by staff"
                icon={EventAvailable}
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricCard
                title="Cancelled"
                value={stats.cancelledCount}
                caption="Dropped from this session"
                icon={Groups2}
              />
            </Grid>
          </Grid>

          <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', mb: 3 }}>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                <Box>
                  <Typography variant="h5" fontWeight={800}>
                    {selectedSession.title}
                  </Typography>
                  <Typography color="text.secondary">
                    {formatSessionTimeRange(selectedSession.starts_at, selectedSession.ends_at)} • {selectedSession.room_name || 'Room TBD'} • {selectedSession.branch_name || 'Main branch'}
                  </Typography>
                </Box>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Chip
                    label={selectedSession.schedule_status}
                    sx={{ alignSelf: 'flex-start', fontWeight: 700, textTransform: 'capitalize' }}
                  />
                  <Button
                    variant="contained"
                    startIcon={<GroupAdd />}
                    onClick={handlePromoteNext}
                    disabled={!stats.waitlistCount || actingKey === `promote-${selectedSession.id}`}
                    sx={{ bgcolor: '#ff2625', borderRadius: 999, '&:hover': { bgcolor: '#df1d1d' } }}
                  >
                    {actingKey === `promote-${selectedSession.id}` ? 'Promoting...' : 'Promote next waitlist'}
                  </Button>
                </Stack>
              </Stack>

              <Typography color="text.secondary">
                {selectedSession.description || 'No extra class description has been added yet.'}
              </Typography>
            </Stack>
          </Paper>

          <Paper className="surface-card" sx={{ p: 0, borderRadius: 4, background: '#fff' }}>
            {!roster.length ? (
              <Box sx={{ p: 3 }}>
                <EmptyStateCard
                  title="No bookings yet"
                  description="Once members reserve or waitlist this class, the roster will appear here."
                />
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Member</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Waitlist</TableCell>
                      <TableCell>Membership</TableCell>
                      <TableCell>Contact</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {roster.map((booking) => (
                      <TableRow key={booking.id} hover>
                        <TableCell>
                          <Stack spacing={0.25}>
                            <Typography fontWeight={700}>
                              {booking.user_full_name || booking.user_email || 'Member'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {booking.plan_name || 'No plan assigned'}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={getBookingStatusLabel(booking.booking_status)}
                            sx={getBookingStatusChipSx(booking.booking_status)}
                          />
                        </TableCell>
                        <TableCell>
                          {booking.booking_status === 'waitlist'
                            ? formatWaitlistLabel(booking)
                            : '—'}
                        </TableCell>
                        <TableCell sx={{ textTransform: 'capitalize' }}>
                          {booking.membership_status || 'trial'}
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.25}>
                            <Typography variant="body2">{booking.user_email || '—'}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {booking.user_phone || 'No phone'}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} justifyContent="flex-end">
                            {booking.booking_status === 'booked' ? (
                              <>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  disabled={actingKey === `${booking.id}:attended`}
                                  onClick={() => handleUpdateBooking(booking.id, 'attended')}
                                  sx={{ borderRadius: 999 }}
                                >
                                  Attended
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  disabled={actingKey === `${booking.id}:missed`}
                                  onClick={() => handleUpdateBooking(booking.id, 'missed')}
                                  sx={{ borderRadius: 999 }}
                                >
                                  Missed
                                </Button>
                              </>
                            ) : null}

                            {booking.booking_status === 'waitlist' ? (
                              <Button
                                size="small"
                                variant="outlined"
                                disabled={actingKey === `${booking.id}:booked`}
                                onClick={() => handleUpdateBooking(booking.id, 'booked')}
                                sx={{ borderRadius: 999 }}
                              >
                                Book spot
                              </Button>
                            ) : null}

                            {!['cancelled', 'attended', 'missed'].includes(booking.booking_status) ? (
                              <Button
                                size="small"
                                color="inherit"
                                variant="outlined"
                                disabled={actingKey === `${booking.id}:cancelled`}
                                onClick={() => handleUpdateBooking(booking.id, 'cancelled')}
                                sx={{ borderRadius: 999 }}
                              >
                                Cancel
                              </Button>
                            ) : (
                              <Button
                                size="small"
                                variant="outlined"
                                disabled={actingKey === `${booking.id}:booked`}
                                onClick={() => handleUpdateBooking(booking.id, 'booked')}
                                sx={{ borderRadius: 999 }}
                              >
                                Reopen
                              </Button>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </>
      ) : (
        <EmptyStateCard
          title="No class sessions found"
          description="Adjust the filters above, then pick a class to inspect its roster."
        />
      )}
    </Box>
  );
};

export default StaffBookingsPage;
