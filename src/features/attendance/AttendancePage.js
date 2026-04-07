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
  Typography,
} from '@mui/material';
import {
  AccessTime,
  CalendarMonth,
  History,
  Login,
  Logout,
} from '@mui/icons-material';

import LoadingScreen from '../../components/common/LoadingScreen';
import MetricCard from '../../components/common/MetricCard';
import SetupNotice from '../../components/common/SetupNotice';
import { useAuth } from '../../context/AuthContext';
import {
  fetchMemberAttendanceVisits,
  recordSelfCheckIn,
  recordSelfCheckOut,
} from '../../services/gymService';
import {
  buildAttendanceSummary,
  formatAttendanceDate,
  formatAttendanceDateTime,
  formatVisitDuration,
  getAttendanceEligibilityMessage,
  getAttendanceSourceLabel,
  getAttendanceStatusChipSx,
  getAttendanceStatusLabel,
  isAttendanceEligibleProfile,
} from './attendanceHelpers';

const AttendancePage = () => {
  const {
    user,
    profile,
    loading,
    isConfigured,
  } = useAuth();

  const [visits, setVisits] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const loadPage = useCallback(async () => {
    if (!user || !isConfigured) {
      setPageLoading(false);
      return;
    }

    try {
      setPageLoading(true);
      const attendanceRows = await fetchMemberAttendanceVisits(user.id, 20);
      setVisits(attendanceRows);
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to load your attendance history.',
      });
    } finally {
      setPageLoading(false);
    }
  }, [isConfigured, user]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const summary = useMemo(() => buildAttendanceSummary(visits), [visits]);
  const attendanceEligible = useMemo(() => isAttendanceEligibleProfile(profile), [profile]);

  const handleSelfCheckIn = async () => {
    try {
      setActionLoading(true);
      setFeedback({ type: '', message: '' });
      await recordSelfCheckIn({
        locationLabel: 'Member self-service',
      });
      await loadPage();
      setFeedback({
        type: 'success',
        message: 'Checked in successfully. Have a great session.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to complete check-in.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelfCheckOut = async () => {
    try {
      setActionLoading(true);
      setFeedback({ type: '', message: '' });
      await recordSelfCheckOut();
      await loadPage();
      setFeedback({
        type: 'success',
        message: 'Checked out successfully. See you next time.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to complete check-out.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || pageLoading) {
    return <LoadingScreen message="Loading attendance tools..." />;
  }

  return (
    <Box sx={{ py: { xs: 3, md: 5 } }}>
      <SetupNotice title="Attendance tools need Supabase setup" />

      <Stack spacing={1.5} mb={4}>
        <Typography color="#ff2625" fontWeight={700}>
          Attendance
        </Typography>
        <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '32px', md: '44px' } }}>
          Self check-in, visit history, and access status
        </Typography>
        <Typography color="text.secondary" maxWidth="900px">
          Members can now check themselves in, monitor recent visits, and verify access before walking in.
          Staff and admin accounts can use this page too, while the staff workspace handles assisted desk check-ins.
        </Typography>
      </Stack>

      {feedback.message ? (
        <Alert severity={feedback.type || 'info'} sx={{ mb: 3, borderRadius: 3 }}>
          {feedback.message}
        </Alert>
      ) : null}

      {!profile ? (
        <Alert severity="warning" sx={{ borderRadius: 3 }}>
          No member profile is available yet. Run <code>supabase/schema.sql</code>, refresh the app, and try again.
        </Alert>
      ) : (
        <>
          <Grid container spacing={3} mb={1}>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricCard
                title="Status"
                value={summary.openVisit ? 'Inside' : 'Checked out'}
                caption={summary.openVisit ? `Started ${formatAttendanceDateTime(summary.openVisit.checked_in_at)}` : 'No active visit'}
                icon={summary.openVisit ? Logout : Login}
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricCard
                title="Visits this month"
                value={summary.thisMonthVisits}
                caption={`${summary.todayVisits} visit(s) today`}
                icon={CalendarMonth}
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricCard
                title="Hours this month"
                value={summary.totalHoursThisMonth}
                caption="Calculated from completed and active visits"
                icon={AccessTime}
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricCard
                title="Last completed visit"
                value={summary.lastCompletedVisit ? formatAttendanceDate(summary.lastCompletedVisit.checked_in_at) : '—'}
                caption={summary.lastCompletedVisit ? formatVisitDuration(summary.lastCompletedVisit) : 'No completed visits yet'}
                icon={History}
              />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12} lg={5}>
              <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
                <Stack spacing={2.5}>
                  <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="h5" fontWeight={800}>
                      Current access
                    </Typography>
                    <Chip
                      label={summary.openVisit ? getAttendanceStatusLabel(summary.openVisit.attendance_status) : 'Checked out'}
                      sx={getAttendanceStatusChipSx(summary.openVisit?.attendance_status || 'checked_out')}
                    />
                  </Stack>

                  <Typography color="text.secondary">
                    {getAttendanceEligibilityMessage(profile)}
                  </Typography>

                  {summary.openVisit ? (
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                      <Stack spacing={0.75}>
                        <Typography fontWeight={700}>
                          You checked in at {formatAttendanceDateTime(summary.openVisit.checked_in_at)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Duration so far: {formatVisitDuration(summary.openVisit)}
                        </Typography>
                        {summary.openVisit.location_label ? (
                          <Typography variant="body2" color="text.secondary">
                            Location: {summary.openVisit.location_label}
                          </Typography>
                        ) : null}
                      </Stack>
                    </Paper>
                  ) : (
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                      <Stack spacing={0.75}>
                        <Typography fontWeight={700}>
                          You are currently checked out.
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Use self-service check-in before your next workout or ask the front desk for help.
                        </Typography>
                      </Stack>
                    </Paper>
                  )}

                  {summary.openVisit ? (
                    <Button
                      variant="contained"
                      startIcon={<Logout />}
                      onClick={handleSelfCheckOut}
                      disabled={actionLoading}
                      sx={{ textTransform: 'none', borderRadius: 999, bgcolor: '#ff2625', '&:hover': { bgcolor: '#df1d1d' } }}
                    >
                      {actionLoading ? 'Checking out...' : 'Check out now'}
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      startIcon={<Login />}
                      onClick={handleSelfCheckIn}
                      disabled={actionLoading || !attendanceEligible}
                      sx={{ textTransform: 'none', borderRadius: 999, bgcolor: '#ff2625', '&:hover': { bgcolor: '#df1d1d' } }}
                    >
                      {actionLoading ? 'Checking in...' : 'Check in now'}
                    </Button>
                  )}

                  {!attendanceEligible && !summary.openVisit ? (
                    <Alert severity="warning" sx={{ borderRadius: 3 }}>
                      Self-service is disabled until your access is active again.
                    </Alert>
                  ) : null}
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} lg={7}>
              <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
                <Stack spacing={2.5}>
                  <Stack spacing={0.5}>
                    <Typography variant="h5" fontWeight={800}>
                      Recent visit history
                    </Typography>
                    <Typography color="text.secondary">
                      The latest 20 check-ins are shown here so members can verify attendance and session length.
                    </Typography>
                  </Stack>

                  {!summary.orderedVisits.length ? (
                    <Alert severity="info" sx={{ borderRadius: 3 }}>
                      No attendance records yet. Your first check-in will appear here.
                    </Alert>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Checked in</TableCell>
                            <TableCell>Checked out</TableCell>
                            <TableCell>Duration</TableCell>
                            <TableCell>Source</TableCell>
                            <TableCell>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {summary.orderedVisits.map((visit) => (
                            <TableRow key={visit.id} hover>
                              <TableCell>{formatAttendanceDate(visit.checked_in_at)}</TableCell>
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
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default AttendancePage;
