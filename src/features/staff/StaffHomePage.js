import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
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
  AssignmentInd,
  Badge,
  CalendarMonth,
  DoorFront,
  EventAvailable,
  FitnessCenter,
  RestaurantMenu,
  Login,
  Logout,
  PersonSearch,
  Refresh,
  ReceiptLong,
  Campaign,
  TrendingUp,
} from '@mui/icons-material';

import { Link as RouterLink } from 'react-router-dom';

import { PATHS } from '../../app/paths';
import LoadingScreen from '../../components/common/LoadingScreen';
import MetricCard from '../../components/common/MetricCard';
import SetupNotice from '../../components/common/SetupNotice';
import { useAuth } from '../../context/AuthContext';
import {
  fetchStaffAttendanceVisits,
  recordStaffCheckIn,
  recordStaffCheckOut,
  searchMembersForAttendance,
} from '../../services/gymService';
import {
  buildStaffAttendanceStats,
  formatAttendanceDateTime,
  formatVisitDuration,
  getAttendanceSourceLabel,
  getAttendanceStatusChipSx,
  getAttendanceStatusLabel,
  getDeskEligibilityLabel,
  isDeskEligibleMember,
  todayIsoDate,
} from '../attendance/attendanceHelpers';

const StaffHomePage = () => {
  const { loading, profile, isConfigured } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [locationLabel, setLocationLabel] = useState('Front desk');
  const [memberRows, setMemberRows] = useState([]);
  const [todayVisits, setTodayVisits] = useState([]);
  const [openVisits, setOpenVisits] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingKey, setActingKey] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const loadDeskData = useCallback(async (queryValue = '', showPageLoader = false) => {
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

      const [directoryRows, todayRows, openRows] = await Promise.all([
        searchMembersForAttendance(queryValue, 12),
        fetchStaffAttendanceVisits({
          visitDate: todayIsoDate(),
          limit: 40,
        }),
        fetchStaffAttendanceVisits({
          visitDate: null,
          openOnly: true,
          limit: 20,
        }),
      ]);

      setMemberRows(directoryRows);
      setTodayVisits(todayRows);
      setOpenVisits(openRows);
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to load attendance operations.',
      });
    } finally {
      setPageLoading(false);
      setRefreshing(false);
    }
  }, [isConfigured]);

  useEffect(() => {
    loadDeskData('', true);
  }, [loadDeskData]);

  const stats = useMemo(
    () => buildStaffAttendanceStats(todayVisits, openVisits),
    [openVisits, todayVisits],
  );

  const deskSource = profile?.role === 'admin' ? 'admin_panel' : 'staff_desk';

  const handleRefresh = async () => {
    await loadDeskData(searchQuery);
  };

  const handleSearchSubmit = async (event) => {
    event.preventDefault();
    await loadDeskData(searchQuery);
  };

  const handleDeskCheckIn = async (member) => {
    const memberLabel = member.full_name || member.email || 'Member';

    try {
      setActingKey(`in:${member.id}`);
      setFeedback({ type: '', message: '' });
      await recordStaffCheckIn(member.id, {
        locationLabel: locationLabel || 'Front desk',
        source: deskSource,
      });
      await loadDeskData(searchQuery);
      setFeedback({
        type: 'success',
        message: `Checked in ${memberLabel}.`,
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || `Unable to check in ${memberLabel}.`,
      });
    } finally {
      setActingKey('');
    }
  };

  const handleDeskCheckOut = async ({ memberId, visitId, memberName }) => {
    try {
      setActingKey(`out:${visitId || memberId}`);
      setFeedback({ type: '', message: '' });
      await recordStaffCheckOut(memberId, {
        visitId,
        source: deskSource,
      });
      await loadDeskData(searchQuery);
      setFeedback({
        type: 'success',
        message: `Checked out ${memberName}.`,
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || `Unable to check out ${memberName}.`,
      });
    } finally {
      setActingKey('');
    }
  };

  if (loading || pageLoading) {
    return <LoadingScreen message="Loading front desk attendance..." />;
  }

  return (
    <Box sx={{ py: { xs: 3, md: 5 } }}>
      <SetupNotice title="Staff attendance tools need Supabase setup" />

      <Stack spacing={1.5} mb={4}>
        <Typography color="#ff2625" fontWeight={700}>
          Staff workspace
        </Typography>
        <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '32px', md: '42px' } }}>
          Front desk attendance and live check-ins
        </Typography>
        <Typography color="text.secondary" maxWidth="860px">
          Staff and admin accounts can search members, assist with manual check-in or check-out,
          and monitor who is currently inside the gym. This is the operational attendance console for the floor.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button
            component={RouterLink}
            to={PATHS.staffSchedule}
            variant="contained"
            startIcon={<CalendarMonth />}
            sx={{ bgcolor: '#ff2625', borderRadius: 999, alignSelf: 'flex-start', '&:hover': { bgcolor: '#df1d1d' } }}
          >
            Manage class schedule
          </Button>
          <Button
            component={RouterLink}
            to={PATHS.staffBookings}
            variant="outlined"
            startIcon={<EventAvailable />}
            sx={{ borderRadius: 999, alignSelf: 'flex-start' }}
          >
            Manage bookings
          </Button>
          <Button
            component={RouterLink}
            to={PATHS.staffTools}
            variant="outlined"
            startIcon={<AssignmentInd />}
            sx={{ borderRadius: 999, alignSelf: 'flex-start' }}
          >
            Staff tools
          </Button>
          <Button
            component={RouterLink}
            to={PATHS.staffProgress}
            variant="outlined"
            startIcon={<TrendingUp />}
            sx={{ borderRadius: 999, alignSelf: 'flex-start' }}
          >
            Track progress
          </Button>
          <Button
            component={RouterLink}
            to={PATHS.staffNutrition}
            variant="outlined"
            startIcon={<RestaurantMenu />}
            sx={{ borderRadius: 999, alignSelf: 'flex-start' }}
          >
            Program nutrition
          </Button>
          <Button
            component={RouterLink}
            to={PATHS.staffWorkouts}
            variant="outlined"
            startIcon={<FitnessCenter />}
            sx={{ borderRadius: 999, alignSelf: 'flex-start' }}
          >
            Program workouts
          </Button>
          <Button
            component={RouterLink}
            to={PATHS.staffBilling}
            variant="outlined"
            startIcon={<ReceiptLong />}
            sx={{ borderRadius: 999, alignSelf: 'flex-start' }}
          >
            Manage billing
          </Button>
          <Button
            component={RouterLink}
            to={PATHS.staffNotifications}
            variant="outlined"
            startIcon={<Campaign />}
            sx={{ borderRadius: 999, alignSelf: 'flex-start' }}
          >
            Send notifications
          </Button>
        </Stack>
      </Stack>

      {feedback.message ? (
        <Alert severity={feedback.type || 'info'} sx={{ mb: 3, borderRadius: 3 }}>
          {feedback.message}
        </Alert>
      ) : null}

      {profile && !profile.is_active ? (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 3 }}>
          Your own staff access is paused. Another admin must reactivate it before desk actions will succeed.
        </Alert>
      ) : null}

      <Grid container spacing={3} mb={1}>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Currently inside"
            value={stats.openVisitsNow}
            caption="Members with an active visit"
            icon={DoorFront}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Visits today"
            value={stats.totalVisitsToday}
            caption={`${stats.completedVisitsToday} checked out`}
            icon={Badge}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Unique members"
            value={stats.uniqueMembersToday}
            caption="Distinct people who visited today"
            icon={PersonSearch}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Desk assisted"
            value={stats.deskAssistedCount}
            caption={`Self-service: ${stats.selfServiceCount}`}
            icon={Refresh}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}>
          <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
            <Stack spacing={2.5}>
              <Stack spacing={0.5}>
                <Typography variant="h5" fontWeight={800}>
                  Search member roster
                </Typography>
                <Typography color="text.secondary">
                  Search by full name, email, or phone number, then check members in or out directly from the desk.
                </Typography>
              </Stack>

              <Box component="form" onSubmit={handleSearchSubmit}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField
                    label="Search members"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Name, email, or phone"
                    fullWidth
                  />
                  <TextField
                    label="Location label"
                    value={locationLabel}
                    onChange={(event) => setLocationLabel(event.target.value)}
                    sx={{ minWidth: { md: 180 } }}
                  />
                  <Stack direction="row" spacing={1}>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={refreshing}
                      sx={{ textTransform: 'none', borderRadius: 999, bgcolor: '#ff2625', '&:hover': { bgcolor: '#df1d1d' } }}
                    >
                      Search
                    </Button>
                    <Button
                      type="button"
                      variant="outlined"
                      onClick={handleRefresh}
                      disabled={refreshing}
                      sx={{ textTransform: 'none', borderRadius: 999 }}
                    >
                      Refresh
                    </Button>
                  </Stack>
                </Stack>
              </Box>

              {!memberRows.length ? (
                <Alert severity="info" sx={{ borderRadius: 3 }}>
                  No members matched this search yet.
                </Alert>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Member</TableCell>
                        <TableCell>Plan / role</TableCell>
                        <TableCell>Access</TableCell>
                        <TableCell>Open visit</TableCell>
                        <TableCell align="right">Desk action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {memberRows.map((member) => {
                        const memberLabel = member.full_name || member.email || 'Member';
                        const checkInKey = `in:${member.id}`;
                        const checkOutKey = `out:${member.open_visit_id || member.id}`;

                        return (
                          <TableRow key={member.id} hover>
                            <TableCell>
                              <Stack spacing={0.5}>
                                <Typography fontWeight={700}>{memberLabel}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {member.email}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Stack spacing={0.5}>
                                <Typography>{member.plan_name || 'No plan assigned'}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {member.role} • {member.membership_status}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={getDeskEligibilityLabel(member)}
                                sx={{
                                  bgcolor: isDeskEligibleMember(member) ? '#e8f5e9' : '#fff4e5',
                                  color: isDeskEligibleMember(member) ? '#1b5e20' : '#9a6700',
                                  fontWeight: 700,
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              {member.has_open_visit ? formatAttendanceDateTime(member.open_checked_in_at) : '—'}
                            </TableCell>
                            <TableCell align="right">
                              {member.has_open_visit ? (
                                <Button
                                  variant="outlined"
                                  size="small"
                                  startIcon={<Logout />}
                                  disabled={actingKey === checkOutKey}
                                  onClick={() => handleDeskCheckOut({
                                    memberId: member.id,
                                    visitId: member.open_visit_id,
                                    memberName: memberLabel,
                                  })}
                                  sx={{ textTransform: 'none', borderRadius: 999 }}
                                >
                                  {actingKey === checkOutKey ? 'Checking out...' : 'Check out'}
                                </Button>
                              ) : (
                                <Button
                                  variant="contained"
                                  size="small"
                                  startIcon={<Login />}
                                  disabled={!isDeskEligibleMember(member) || actingKey === checkInKey}
                                  onClick={() => handleDeskCheckIn(member)}
                                  sx={{ textTransform: 'none', borderRadius: 999, bgcolor: '#ff2625', '&:hover': { bgcolor: '#df1d1d' } }}
                                >
                                  {actingKey === checkInKey ? 'Checking in...' : 'Check in'}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Stack spacing={3} height="100%">
            <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
              <Stack spacing={2.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                  <Box>
                    <Typography variant="h5" fontWeight={800}>
                      Currently inside
                    </Typography>
                    <Typography color="text.secondary">
                      Members with an open visit can be checked out directly from here.
                    </Typography>
                  </Box>
                  <Chip label={`${stats.openVisitsNow} live`} sx={{ bgcolor: '#fff0f0', color: '#ff2625', fontWeight: 700 }} />
                </Stack>

                {!openVisits.length ? (
                  <Alert severity="info" sx={{ borderRadius: 3 }}>
                    Nobody is currently checked in.
                  </Alert>
                ) : (
                  <Stack spacing={1.5}>
                    {openVisits.map((visit) => (
                      <Paper key={visit.id} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
                          <Stack spacing={0.5}>
                            <Typography fontWeight={700}>{visit.member_name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {formatAttendanceDateTime(visit.checked_in_at)} • {formatVisitDuration(visit)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {getAttendanceSourceLabel(visit.check_in_source)}{visit.location_label ? ` • ${visit.location_label}` : ''}
                            </Typography>
                          </Stack>
                          <Button
                            variant="outlined"
                            startIcon={<Logout />}
                            disabled={actingKey === `out:${visit.id}`}
                            onClick={() => handleDeskCheckOut({
                              memberId: visit.profile_id,
                              visitId: visit.id,
                              memberName: visit.member_name,
                            })}
                            sx={{ textTransform: 'none', borderRadius: 999, alignSelf: 'flex-start' }}
                          >
                            {actingKey === `out:${visit.id}` ? 'Checking out...' : 'Check out'}
                          </Button>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Stack>
            </Paper>

            <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', flexGrow: 1 }}>
              <Stack spacing={2.5}>
                <Stack spacing={0.5}>
                  <Typography variant="h5" fontWeight={800}>
                    Today&apos;s visit log
                  </Typography>
                  <Typography color="text.secondary">
                    Recent attendance activity for {todayIsoDate()}.
                  </Typography>
                </Stack>

                {!todayVisits.length ? (
                  <Alert severity="info" sx={{ borderRadius: 3 }}>
                    No attendance events have been recorded today yet.
                  </Alert>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Member</TableCell>
                          <TableCell>Checked in</TableCell>
                          <TableCell>Checked out</TableCell>
                          <TableCell>Duration</TableCell>
                          <TableCell>Source</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {todayVisits.map((visit) => (
                          <TableRow key={visit.id} hover>
                            <TableCell>
                              <Stack spacing={0.25}>
                                <Typography fontWeight={700}>{visit.member_name}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {visit.member_email}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>{formatAttendanceDateTime(visit.checked_in_at)}</TableCell>
                            <TableCell>{visit.checked_out_at ? formatAttendanceDateTime(visit.checked_out_at) : '—'}</TableCell>
                            <TableCell>{formatVisitDuration(visit)}</TableCell>
                            <TableCell>{getAttendanceSourceLabel(visit.check_in_source)}</TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={getAttendanceStatusLabel(visit.attendance_status)}
                                sx={getAttendanceStatusChipSx(visit.attendance_status)}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StaffHomePage;
