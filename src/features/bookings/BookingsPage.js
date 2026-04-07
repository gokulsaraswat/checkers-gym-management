import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  CalendarMonth,
  EventAvailable,
  HourglassTop,
  PlaylistAddCheck,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

import { PATHS } from '../../app/paths';
import EmptyStateCard from '../../components/common/EmptyStateCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import MetricCard from '../../components/common/MetricCard';
import SetupNotice from '../../components/common/SetupNotice';
import { useAuth } from '../../context/AuthContext';
import {
  cancelClassBooking,
  fetchMemberClassBookings,
} from '../../services/gymService';
import { formatSessionTimeRange } from '../classes/classScheduleHelpers';
import {
  buildBookingPageStats,
  getBookingStatusChipSx,
  getBookingStatusLabel,
  splitBookings,
} from './bookingHelpers';

const BookingsPage = () => {
  const { user, loading, isConfigured } = useAuth();

  const [bookings, setBookings] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [actingSessionId, setActingSessionId] = useState('');

  const loadBookings = useCallback(async () => {
    if (!user || !isConfigured) {
      setPageLoading(false);
      return;
    }

    try {
      setPageLoading(true);
      const rows = await fetchMemberClassBookings(user.id);
      setBookings(rows);
      setFeedback((current) => (current.type === 'error' ? { type: '', message: '' } : current));
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to load your class bookings.',
      });
    } finally {
      setPageLoading(false);
    }
  }, [isConfigured, user]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const stats = useMemo(() => buildBookingPageStats(bookings), [bookings]);
  const sections = useMemo(() => splitBookings(bookings), [bookings]);

  const handleCancel = async (booking) => {
    const sessionTitle = booking?.class_session?.title || 'this class';
    if (!window.confirm(`Cancel ${sessionTitle}?`)) {
      return;
    }

    try {
      setActingSessionId(booking.class_session_id || booking.class_session?.id || booking.id);
      setFeedback({ type: '', message: '' });
      await cancelClassBooking(booking.class_session_id || booking.class_session?.id);
      await loadBookings();
      setFeedback({
        type: 'success',
        message: `${sessionTitle} was cancelled. If a waitlist existed, the next member has been promoted automatically.`,
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || `Unable to cancel ${sessionTitle}.`,
      });
    } finally {
      setActingSessionId('');
    }
  };

  if (loading || pageLoading) {
    return <LoadingScreen message="Loading your bookings..." />;
  }

  return (
    <Box sx={{ py: { xs: 3, md: 5 } }}>
      <SetupNotice title="Class bookings need Supabase setup" />

      <Stack spacing={1.5} mb={4}>
        <Typography color="#ff2625" fontWeight={700}>
          My bookings
        </Typography>
        <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '32px', md: '42px' } }}>
          Manage your reservations, waitlists, and attendance outcomes
        </Typography>
        <Typography color="text.secondary" maxWidth="860px">
          This is your single place to review booked classes, waitlist entries, and past attendance results.
          Use the schedule board to discover new sessions and this page to keep your reservations tidy.
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
            title="Active reservations"
            value={stats.activeCount}
            caption="Booked or waitlisted upcoming sessions"
            icon={EventAvailable}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Booked"
            value={stats.bookedCount}
            caption="Confirmed spots"
            icon={PlaylistAddCheck}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Waitlists"
            value={stats.waitlistCount}
            caption="Sessions waiting for a space"
            icon={HourglassTop}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Completed"
            value={stats.completedCount}
            caption="Attended or missed outcomes"
            icon={CalendarMonth}
          />
        </Grid>
      </Grid>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={3}>
        <Button
          component={RouterLink}
          to={PATHS.schedule}
          variant="contained"
          sx={{ bgcolor: '#ff2625', borderRadius: 999, '&:hover': { bgcolor: '#df1d1d' } }}
        >
          Browse schedule
        </Button>
        <Button
          component={RouterLink}
          to={PATHS.dashboard}
          variant="outlined"
          sx={{ borderRadius: 999 }}
        >
          Back to dashboard
        </Button>
      </Stack>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
            <Stack spacing={2.5}>
              <Stack spacing={0.5}>
                <Typography variant="h5" fontWeight={800}>
                  Upcoming reservations
                </Typography>
                <Typography color="text.secondary">
                  Cancel booked or waitlisted sessions here if your plans change.
                </Typography>
              </Stack>

              {!sections.upcoming.length ? (
                <EmptyStateCard
                  title="Nothing upcoming yet"
                  description="Head to the class schedule to reserve a spot or join a waitlist."
                />
              ) : (
                sections.upcoming.map((booking, index) => {
                  const session = booking.class_session || {};
                  const isActing = actingSessionId === (booking.class_session_id || session.id || booking.id);

                  return (
                    <React.Fragment key={booking.id}>
                      <Stack spacing={1.5}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
                          <Box>
                            <Typography variant="h6" fontWeight={800}>
                              {session.title || 'Scheduled class'}
                            </Typography>
                            <Typography color="text.secondary">
                              {session.description || 'Class details will appear here once staff add them.'}
                            </Typography>
                          </Box>

                          <Chip
                            label={getBookingStatusLabel(booking.booking_status)}
                            sx={getBookingStatusChipSx(booking.booking_status)}
                          />
                        </Stack>

                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <Typography color="text.secondary" variant="body2">
                              Time
                            </Typography>
                            <Typography fontWeight={700}>
                              {formatSessionTimeRange(session.starts_at, session.ends_at)}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <Typography color="text.secondary" variant="body2">
                              Coach
                            </Typography>
                            <Typography fontWeight={700}>
                              {session.coach_name || session.trainer_name || 'Coach assigned later'}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <Typography color="text.secondary" variant="body2">
                              Room
                            </Typography>
                            <Typography fontWeight={700}>
                              {session.room_name || 'TBD'}
                            </Typography>
                          </Grid>
                        </Grid>

                        {booking.booking_status === 'waitlist' && booking.waitlist_position ? (
                          <Alert severity="info" sx={{ borderRadius: 3 }}>
                            You are currently #{booking.waitlist_position} on the waitlist for this session.
                          </Alert>
                        ) : null}

                        {booking.notes ? (
                          <Typography variant="body2" color="text.secondary">
                            Notes: {booking.notes}
                          </Typography>
                        ) : null}

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                          <Button
                            variant="outlined"
                            color="inherit"
                            disabled={isActing}
                            onClick={() => handleCancel(booking)}
                            sx={{ borderRadius: 999, alignSelf: 'flex-start' }}
                          >
                            {(() => {
                              if (isActing) return 'Updating...';
                              return booking.booking_status === 'waitlist' ? 'Leave waitlist' : 'Cancel booking';
                            })()}
                          </Button>
                        </Stack>
                      </Stack>

                      {index < sections.upcoming.length - 1 ? <Divider /> : null}
                    </React.Fragment>
                  );
                })
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
            <Stack spacing={2.5}>
              <Stack spacing={0.5}>
                <Typography variant="h5" fontWeight={800}>
                  History and outcomes
                </Typography>
                <Typography color="text.secondary">
                  Review attended, missed, and cancelled classes over time.
                </Typography>
              </Stack>

              {!sections.history.length ? (
                <EmptyStateCard
                  title="No booking history yet"
                  description="Your past class outcomes will appear here after you attend or cancel sessions."
                />
              ) : (
                sections.history.map((booking, index) => {
                  const session = booking.class_session || {};

                  return (
                    <React.Fragment key={booking.id}>
                      <Stack spacing={1.25}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                          <Box>
                            <Typography fontWeight={700}>
                              {session.title || 'Scheduled class'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {formatSessionTimeRange(session.starts_at, session.ends_at)}
                            </Typography>
                          </Box>

                          <Chip
                            size="small"
                            label={getBookingStatusLabel(booking.booking_status)}
                            sx={getBookingStatusChipSx(booking.booking_status)}
                          />
                        </Stack>

                        <Typography variant="body2" color="text.secondary">
                          {session.room_name || 'Studio TBD'} • {session.branch_name || 'Main branch'}
                        </Typography>

                        {booking.cancel_reason ? (
                          <Typography variant="body2" color="text.secondary">
                            Cancel reason: {booking.cancel_reason}
                          </Typography>
                        ) : null}
                      </Stack>

                      {index < sections.history.length - 1 ? <Divider /> : null}
                    </React.Fragment>
                  );
                })
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BookingsPage;
