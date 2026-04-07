
import React, { useEffect, useMemo, useState } from 'react';
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
  TextField,
  Typography,
} from '@mui/material';
import {
  AdminPanelSettings,
  AssignmentTurnedIn,
  ArrowBack,
  BadgeOutlined,
  HistoryEdu,
} from '@mui/icons-material';
import { Link as RouterLink, useParams } from 'react-router-dom';

import { PATHS } from '../../app/paths';
import EmptyStateCard from '../../components/common/EmptyStateCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import SetupNotice from '../../components/common/SetupNotice';
import { useAuth } from '../../context/AuthContext';
import {
  fetchAvailablePlans,
  fetchMemberById,
  fetchMemberWaivers,
  fetchMembershipStatusHistory,
  recordMemberWaiver,
  updateMember,
} from '../../services/gymService';
import {
  buildMemberFormValues,
  CURRENT_LIABILITY_WAIVER_VERSION,
  formatDateTimeValue,
  formatDateValue,
  getMembershipStatusChipSx,
  getMembershipStatusLabel,
  getWaiverChipSx,
  getWaiverStatusLabel,
  MEMBERSHIP_STATUS_OPTIONS,
} from './memberLifecycle';

const MemberDetailPage = () => {
  const { memberId } = useParams();
  const { loading, profile } = useAuth();

  const [member, setMember] = useState(null);
  const [plans, setPlans] = useState([]);
  const [history, setHistory] = useState([]);
  const [waivers, setWaivers] = useState([]);
  const [form, setForm] = useState(buildMemberFormValues());
  const [waiverForm, setWaiverForm] = useState({
    version: CURRENT_LIABILITY_WAIVER_VERSION,
    notes: '',
  });
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordingWaiver, setRecordingWaiver] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [waiverFeedback, setWaiverFeedback] = useState({ type: '', message: '' });

  const loadPage = async () => {
    if (!memberId) {
      setPageLoading(false);
      return;
    }

    try {
      setPageLoading(true);
      const [memberRow, planRows, historyRows, waiverRows] = await Promise.all([
        fetchMemberById(memberId),
        fetchAvailablePlans(),
        fetchMembershipStatusHistory(memberId),
        fetchMemberWaivers(memberId),
      ]);

      setMember(memberRow);
      setPlans(planRows);
      setHistory(historyRows);
      setWaivers(waiverRows);
      setForm(buildMemberFormValues(memberRow));
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to load member details.',
      });
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, [memberId]);

  const lifecycleSummary = useMemo(() => ({
    membershipLabel: getMembershipStatusLabel(member?.membership_status),
    waiverLabel: getWaiverStatusLabel(member),
  }), [member]);

  if (loading || pageLoading) {
    return <LoadingScreen message="Loading member details..." />;
  }

  const handleFieldChange = (field) => (event) => {
    const nextValue = field === 'isActive' ? event.target.checked : event.target.value;

    setForm((current) => ({
      ...current,
      [field]: nextValue,
    }));
  };

  const handleWaiverFieldChange = (field) => (event) => {
    setWaiverForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });

    if (!form.fullName.trim()) {
      setFeedback({ type: 'error', message: 'Full name is required.' });
      return;
    }

    try {
      setSaving(true);
      await updateMember(memberId, {
        fullName: form.fullName,
        phone: form.phone,
        dateOfBirth: form.dateOfBirth,
        address: form.address,
        emergencyContactName: form.emergencyContactName,
        emergencyContactPhone: form.emergencyContactPhone,
        fitnessGoal: form.fitnessGoal,
        role: form.role,
        planId: form.planId,
        isActive: form.isActive,
        membershipStatus: form.membershipStatus,
        membershipStartDate: form.membershipStartDate,
        membershipEndDate: form.membershipEndDate,
        nextBillingDate: form.nextBillingDate,
      });
      await loadPage();
      setFeedback({ type: 'success', message: 'Member profile saved successfully.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to save member details.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRecordWaiver = async (event) => {
    event.preventDefault();
    setWaiverFeedback({ type: '', message: '' });

    if (!waiverForm.version.trim()) {
      setWaiverFeedback({ type: 'error', message: 'Waiver version is required.' });
      return;
    }

    try {
      setRecordingWaiver(true);
      await recordMemberWaiver(memberId, {
        version: waiverForm.version,
        notes: waiverForm.notes,
        recordedSource: 'admin_panel',
      });
      setWaiverForm({
        version: waiverForm.version.trim(),
        notes: '',
      });
      await loadPage();
      setWaiverFeedback({ type: 'success', message: 'Waiver acknowledgement recorded.' });
    } catch (error) {
      setWaiverFeedback({
        type: 'error',
        message: error.message || 'Unable to record waiver acknowledgement.',
      });
    } finally {
      setRecordingWaiver(false);
    }
  };

  return (
    <Box sx={{ py: { xs: 3, md: 5 } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" mb={4}>
        <Stack spacing={1.5}>
          <Typography color="#ff2625" fontWeight={700}>
            Member detail
          </Typography>
          <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '32px', md: '42px' } }}>
            {member?.full_name || member?.email || 'Member record'}
          </Typography>
          <Typography color="text.secondary" maxWidth="860px">
            Edit lifecycle dates, plan assignment, waiver records, and emergency details from one place.
          </Typography>
        </Stack>

        <Button
          component={RouterLink}
          to={PATHS.admin}
          startIcon={<ArrowBack />}
          variant="outlined"
          sx={{ textTransform: 'none', borderRadius: 999, alignSelf: 'flex-start' }}
        >
          Back to admin panel
        </Button>
      </Stack>

      <SetupNotice title="Member lifecycle tools need Supabase setup" />

      {!member ? (
        <EmptyStateCard
          title="Member not found"
          description="The selected member profile could not be loaded."
          action={(
            <Button component={RouterLink} to={PATHS.admin} variant="contained" sx={{ textTransform: 'none', borderRadius: 999, bgcolor: '#ff2625', '&:hover': { bgcolor: '#df1d1d' } }}>
              Return to admin
            </Button>
          )}
        />
      ) : (
        <>
          {feedback.message ? (
            <Alert severity={feedback.type || 'info'} sx={{ mb: 3, borderRadius: 3 }}>
              {feedback.message}
            </Alert>
          ) : null}

          {!profile?.is_active ? (
            <Alert severity="warning" sx={{ mb: 3, borderRadius: 3 }}>
              Your own admin profile is inactive. Some management actions may fail until another admin reactivates it.
            </Alert>
          ) : null}

          <Grid container spacing={3}>
            <Grid item xs={12} lg={4}>
              <Stack spacing={3}>
                <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
                  <Stack spacing={2}>
                    <Typography color="#ff2625" fontWeight={700}>
                      Member overview
                    </Typography>
                    <Typography variant="h5" fontWeight={800}>
                      {member.full_name || member.email}
                    </Typography>
                    <Typography color="text.secondary">
                      {member.email}
                    </Typography>

                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Chip label={lifecycleSummary.membershipLabel} sx={getMembershipStatusChipSx(member.membership_status)} />
                      <Chip label={lifecycleSummary.waiverLabel} sx={getWaiverChipSx(Boolean(member.waiver_signed_at))} />
                    </Stack>

                    <Divider />

                    <Stack spacing={1.2}>
                      <Typography variant="body1"><strong>Role:</strong> {member.role}</Typography>
                      <Typography variant="body1"><strong>Plan:</strong> {member.plan?.name || 'No plan assigned'}</Typography>
                      <Typography variant="body1"><strong>Member since:</strong> {formatDateValue(member.member_since)}</Typography>
                      <Typography variant="body1"><strong>Membership starts:</strong> {formatDateValue(member.membership_start_date)}</Typography>
                      <Typography variant="body1"><strong>Membership renews/ends:</strong> {formatDateValue(member.membership_end_date)}</Typography>
                      <Typography variant="body1"><strong>Next billing:</strong> {formatDateValue(member.next_billing_date)}</Typography>
                      <Typography variant="body1"><strong>Account access:</strong> {member.is_active ? 'Enabled' : 'Disabled'}</Typography>
                    </Stack>
                  </Stack>
                </Paper>

                <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
                  <Stack spacing={1.5}>
                    <Typography color="#ff2625" fontWeight={700}>
                      Lifecycle audit
                    </Typography>
                    <Typography color="text.secondary" lineHeight={1.8}>
                      Changing the member status, plan, or lifecycle dates automatically adds a row to the membership
                      history so admins can see how the profile changed over time.
                    </Typography>
                  </Stack>
                </Paper>
              </Stack>
            </Grid>

            <Grid item xs={12} lg={8}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} alignItems={{ xs: 'flex-start', md: 'center' }} mb={3}>
                      <Box
                        sx={{
                          width: 58,
                          height: 58,
                          borderRadius: '20px',
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: '#fff0f0',
                          color: '#ff2625',
                        }}
                      >
                        <AdminPanelSettings />
                      </Box>
                      <Box>
                        <Typography variant="h5" fontWeight={800}>
                          Editable member record
                        </Typography>
                        <Typography color="text.secondary">
                          Save profile, access, and lifecycle details for this member.
                        </Typography>
                      </Box>
                    </Stack>

                    <Box component="form" onSubmit={handleSave}>
                      <Grid container spacing={2.5}>
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Full name"
                            value={form.fullName}
                            onChange={handleFieldChange('fullName')}
                            fullWidth
                            required
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Email"
                            value={member.email || ''}
                            fullWidth
                            disabled
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Phone number"
                            value={form.phone}
                            onChange={handleFieldChange('phone')}
                            fullWidth
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Date of birth"
                            type="date"
                            value={form.dateOfBirth}
                            onChange={handleFieldChange('dateOfBirth')}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Emergency contact name"
                            value={form.emergencyContactName}
                            onChange={handleFieldChange('emergencyContactName')}
                            fullWidth
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Emergency contact phone"
                            value={form.emergencyContactPhone}
                            onChange={handleFieldChange('emergencyContactPhone')}
                            fullWidth
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            label="Address"
                            value={form.address}
                            onChange={handleFieldChange('address')}
                            fullWidth
                            multiline
                            minRows={2}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            label="Fitness goals / notes"
                            value={form.fitnessGoal}
                            onChange={handleFieldChange('fitnessGoal')}
                            fullWidth
                            multiline
                            minRows={3}
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            select
                            label="Role"
                            value={form.role}
                            onChange={handleFieldChange('role')}
                            fullWidth
                          >
                            <MenuItem value="member">Member</MenuItem>
                            <MenuItem value="staff">Staff</MenuItem>
                            <MenuItem value="admin">Admin</MenuItem>
                          </TextField>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            select
                            label="Assigned plan"
                            value={form.planId}
                            onChange={handleFieldChange('planId')}
                            fullWidth
                          >
                            <MenuItem value="">No plan assigned</MenuItem>
                            {plans.map((plan) => (
                              <MenuItem key={plan.id} value={plan.id}>
                                {plan.name}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            select
                            label="Membership status"
                            value={form.membershipStatus}
                            onChange={handleFieldChange('membershipStatus')}
                            fullWidth
                          >
                            {MEMBERSHIP_STATUS_OPTIONS.map((status) => (
                              <MenuItem key={status.value} value={status.value}>
                                {status.label}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            label="Membership start date"
                            type="date"
                            value={form.membershipStartDate}
                            onChange={handleFieldChange('membershipStartDate')}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            label="Membership end date"
                            type="date"
                            value={form.membershipEndDate}
                            onChange={handleFieldChange('membershipEndDate')}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            label="Next billing date"
                            type="date"
                            value={form.nextBillingDate}
                            onChange={handleFieldChange('nextBillingDate')}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <FormControlLabel
                            control={(
                              <Switch
                                checked={form.isActive}
                                onChange={handleFieldChange('isActive')}
                              />
                            )}
                            label="Account access is enabled"
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <Button
                            type="submit"
                            variant="contained"
                            disabled={saving}
                            sx={{
                              bgcolor: '#ff2625',
                              textTransform: 'none',
                              borderRadius: 999,
                              px: 3,
                              '&:hover': { bgcolor: '#df1d1d' },
                            }}
                          >
                            {saving ? 'Saving...' : 'Save member record'}
                          </Button>
                        </Grid>
                      </Grid>
                    </Box>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
                      <Box
                        sx={{
                          width: 46,
                          height: 46,
                          borderRadius: '16px',
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: '#fff0f0',
                          color: '#ff2625',
                        }}
                      >
                        <AssignmentTurnedIn />
                      </Box>
                      <Typography variant="h6" fontWeight={800}>
                        Waiver records
                      </Typography>
                    </Stack>

                    {waiverFeedback.message ? (
                      <Alert severity={waiverFeedback.type || 'info'} sx={{ mb: 2, borderRadius: 3 }}>
                        {waiverFeedback.message}
                      </Alert>
                    ) : null}

                    <Box component="form" onSubmit={handleRecordWaiver}>
                      <Stack spacing={2}>
                        <TextField
                          label="Waiver version"
                          value={waiverForm.version}
                          onChange={handleWaiverFieldChange('version')}
                          fullWidth
                        />
                        <TextField
                          label="Notes"
                          value={waiverForm.notes}
                          onChange={handleWaiverFieldChange('notes')}
                          fullWidth
                          multiline
                          minRows={2}
                        />
                        <Button
                          type="submit"
                          variant="outlined"
                          disabled={recordingWaiver}
                          sx={{ textTransform: 'none', borderRadius: 999, alignSelf: 'flex-start' }}
                        >
                          {recordingWaiver ? 'Recording...' : 'Record waiver acknowledgement'}
                        </Button>
                      </Stack>
                    </Box>

                    <Divider sx={{ my: 3 }} />

                    <Stack spacing={2}>
                      {waivers.length ? waivers.map((waiver) => (
                        <Paper
                          key={waiver.id}
                          variant="outlined"
                          sx={{ p: 2, borderRadius: 3, borderColor: 'rgba(148, 163, 184, 0.25)' }}
                        >
                          <Stack spacing={1}>
                            <Typography fontWeight={700}>
                              {waiver.version}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Accepted {formatDateTimeValue(waiver.accepted_at)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Source: {waiver.recorded_source.replace('_', ' ')}
                            </Typography>
                            {waiver.notes ? (
                              <Typography variant="body2" color="text.secondary">
                                Notes: {waiver.notes}
                              </Typography>
                            ) : null}
                          </Stack>
                        </Paper>
                      )) : (
                        <Typography color="text.secondary">
                          No waiver activity has been recorded for this member yet.
                        </Typography>
                      )}
                    </Stack>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
                      <Box
                        sx={{
                          width: 46,
                          height: 46,
                          borderRadius: '16px',
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: '#fff0f0',
                          color: '#ff2625',
                        }}
                      >
                        <HistoryEdu />
                      </Box>
                      <Typography variant="h6" fontWeight={800}>
                        Membership history
                      </Typography>
                    </Stack>

                    <Stack spacing={2}>
                      {history.length ? history.map((row) => (
                        <Paper
                          key={row.id}
                          variant="outlined"
                          sx={{ p: 2, borderRadius: 3, borderColor: 'rgba(148, 163, 184, 0.25)' }}
                        >
                          <Stack spacing={1}>
                            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap">
                              <Chip
                                label={getMembershipStatusLabel(row.next_status)}
                                sx={getMembershipStatusChipSx(row.next_status)}
                              />
                              <Typography variant="body2" color="text.secondary">
                                Effective {formatDateValue(row.effective_on)}
                              </Typography>
                            </Stack>
                            {row.previous_status ? (
                              <Typography variant="body2" color="text.secondary">
                                Previous status: {getMembershipStatusLabel(row.previous_status)}
                              </Typography>
                            ) : null}
                            <Typography variant="body2" color="text.secondary">
                              Membership window: {formatDateValue(row.membership_start_date)} → {formatDateValue(row.membership_end_date)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Logged from {row.change_source.replace('_', ' ')}
                            </Typography>
                            {row.change_reason ? (
                              <Typography variant="body2" color="text.secondary">
                                Reason: {row.change_reason}
                              </Typography>
                            ) : null}
                          </Stack>
                        </Paper>
                      )) : (
                        <Typography color="text.secondary">
                          Membership history will appear here when lifecycle values change.
                        </Typography>
                      )}
                    </Stack>
                  </Paper>
                </Grid>

                <Grid item xs={12}>
                  <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} alignItems={{ xs: 'flex-start', md: 'center' }}>
                      <Box
                        sx={{
                          width: 58,
                          height: 58,
                          borderRadius: '20px',
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: '#fff0f0',
                          color: '#ff2625',
                        }}
                      >
                        <BadgeOutlined />
                      </Box>
                      <Box>
                        <Typography variant="h6" fontWeight={800}>
                          Admin note
                        </Typography>
                        <Typography color="text.secondary">
                          Email is shown here as read-only because auth email changes should stay in the protected auth
                          system, not as a regular row update on the profile table.
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default MemberDetailPage;
