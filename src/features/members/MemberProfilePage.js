
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  AssignmentTurnedIn,
  ContactPhone,
  MedicalInformation,
  PersonOutline,
} from '@mui/icons-material';

import SetupNotice from '../../components/common/SetupNotice';
import LoadingScreen from '../../components/common/LoadingScreen';
import { useAuth } from '../../context/AuthContext';
import {
  fetchMemberWaivers,
  fetchMembershipStatusHistory,
  signCurrentLiabilityWaiver,
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
} from './memberLifecycle';

const MemberProfilePage = () => {
  const {
    user,
    profile,
    loading,
    isConfigured,
    refreshProfile,
    updateMyProfile,
  } = useAuth();

  const [form, setForm] = useState(buildMemberFormValues());
  const [history, setHistory] = useState([]);
  const [waivers, setWaivers] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingWaiver, setSigningWaiver] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [waiverFeedback, setWaiverFeedback] = useState({ type: '', message: '' });

  useEffect(() => {
    setForm(buildMemberFormValues(profile));
  }, [profile]);

  const loadPage = async () => {
    if (!user || !isConfigured) {
      setPageLoading(false);
      return;
    }

    try {
      setPageLoading(true);
      await refreshProfile();
      const [historyRows, waiverRows] = await Promise.all([
        fetchMembershipStatusHistory(user.id),
        fetchMemberWaivers(user.id),
      ]);
      setHistory(historyRows);
      setWaivers(waiverRows);
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to load your membership profile.',
      });
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, [user, isConfigured]);

  if (loading || pageLoading) {
    return <LoadingScreen message="Loading your membership profile..." />;
  }

  const handleFieldChange = (field) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });

    if (!form.fullName.trim()) {
      setFeedback({ type: 'error', message: 'Full name is required.' });
      return;
    }

    try {
      setSaving(true);
      await updateMyProfile({
        fullName: form.fullName,
        phone: form.phone,
        dateOfBirth: form.dateOfBirth,
        address: form.address,
        emergencyContactName: form.emergencyContactName,
        emergencyContactPhone: form.emergencyContactPhone,
        fitnessGoal: form.fitnessGoal,
      });
      await loadPage();
      setFeedback({ type: 'success', message: 'Membership profile updated.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to update your membership profile.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignWaiver = async () => {
    setWaiverFeedback({ type: '', message: '' });

    try {
      setSigningWaiver(true);
      await signCurrentLiabilityWaiver(CURRENT_LIABILITY_WAIVER_VERSION);
      await loadPage();
      setWaiverFeedback({ type: 'success', message: 'Liability waiver recorded successfully.' });
    } catch (error) {
      setWaiverFeedback({
        type: 'error',
        message: error.message || 'Unable to record your liability waiver.',
      });
    } finally {
      setSigningWaiver(false);
    }
  };

  return (
    <Box sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={1.5} mb={4}>
        <Typography color="#ff2625" fontWeight={700}>
          Membership profile
        </Typography>
        <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '32px', md: '42px' } }}>
          Keep your member record complete
        </Typography>
        <Typography color="text.secondary" maxWidth="860px">
          Update your personal details, emergency contact, and waiver acknowledgement so the gym team always has the
          latest information for your membership.
        </Typography>
      </Stack>

      <SetupNotice title="Membership profiles need Supabase setup" />

      {!profile ? (
        <Alert severity="warning" sx={{ borderRadius: 3 }}>
          No member profile was found for your account yet. Run <code>supabase/schema.sql</code> and refresh the app.
        </Alert>
      ) : (
        <>
          {feedback.message ? (
            <Alert severity={feedback.type || 'info'} sx={{ mb: 3, borderRadius: 3 }}>
              {feedback.message}
            </Alert>
          ) : null}

          {!profile.is_active ? (
            <Alert severity="warning" sx={{ mb: 3, borderRadius: 3 }}>
              Your account is currently marked inactive. You can still review your record here, but an admin needs to
              reactivate your access.
            </Alert>
          ) : null}

          <Grid container spacing={3}>
            <Grid item xs={12} lg={4}>
              <Stack spacing={3}>
                <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
                  <Stack spacing={2}>
                    <Typography color="#ff2625" fontWeight={700}>
                      Membership summary
                    </Typography>
                    <Typography variant="h5" fontWeight={800}>
                      {profile.full_name || profile.email}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Chip
                        label={getMembershipStatusLabel(profile.membership_status)}
                        sx={getMembershipStatusChipSx(profile.membership_status)}
                      />
                      <Chip
                        label={getWaiverStatusLabel(profile)}
                        sx={getWaiverChipSx(Boolean(profile.waiver_signed_at))}
                      />
                    </Stack>

                    <Divider />

                    <Stack spacing={1.25}>
                      <Typography variant="body1"><strong>Plan:</strong> {profile.plan?.name || 'No plan assigned'}</Typography>
                      <Typography variant="body1"><strong>Member since:</strong> {formatDateValue(profile.member_since)}</Typography>
                      <Typography variant="body1"><strong>Membership starts:</strong> {formatDateValue(profile.membership_start_date)}</Typography>
                      <Typography variant="body1"><strong>Membership renews/ends:</strong> {formatDateValue(profile.membership_end_date)}</Typography>
                      <Typography variant="body1"><strong>Next billing:</strong> {formatDateValue(profile.next_billing_date)}</Typography>
                      <Typography variant="body1"><strong>Emergency contact:</strong> {profile.emergency_contact_name || 'Not added yet'}</Typography>
                    </Stack>
                  </Stack>
                </Paper>

                <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
                  <Stack spacing={1.5}>
                    <Typography color="#ff2625" fontWeight={700}>
                      Waiver acknowledgement
                    </Typography>
                    <Typography variant="h6" fontWeight={800}>
                      Liability waiver
                    </Typography>
                    <Typography color="text.secondary" lineHeight={1.8}>
                      Keep your liability waiver current so staff can verify your acknowledgement quickly during
                      onboarding, renewals, or staffed check-ins.
                    </Typography>

                    {waiverFeedback.message ? (
                      <Alert severity={waiverFeedback.type || 'info'} sx={{ borderRadius: 3 }}>
                        {waiverFeedback.message}
                      </Alert>
                    ) : null}

                    <Stack spacing={1}>
                      <Typography variant="body2" color="text.secondary">
                        Latest recorded waiver
                      </Typography>
                      <Typography fontWeight={700}>
                        {profile.waiver_signed_at
                          ? `${profile.current_waiver_version || 'Version saved'} • ${formatDateTimeValue(profile.waiver_signed_at)}`
                          : 'Not recorded yet'}
                      </Typography>
                    </Stack>

                    <Button
                      variant="contained"
                      onClick={handleSignWaiver}
                      disabled={signingWaiver}
                      sx={{
                        bgcolor: '#ff2625',
                        textTransform: 'none',
                        borderRadius: 999,
                        alignSelf: 'flex-start',
                        '&:hover': { bgcolor: '#df1d1d' },
                      }}
                    >
                      {signingWaiver ? 'Recording...' : 'Acknowledge liability waiver'}
                    </Button>
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
                        <PersonOutline />
                      </Box>
                      <Box>
                        <Typography variant="h5" fontWeight={800}>
                          Personal and emergency details
                        </Typography>
                        <Typography color="text.secondary">
                          These fields stay on your member record and help the gym contact you if needed.
                        </Typography>
                      </Box>
                    </Stack>

                    <Box component="form" onSubmit={handleSubmit}>
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
                            label="Fitness goals"
                            value={form.fitnessGoal}
                            onChange={handleFieldChange('fitnessGoal')}
                            fullWidth
                            multiline
                            minRows={3}
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
                            {saving ? 'Saving...' : 'Save membership profile'}
                          </Button>
                        </Grid>
                      </Grid>
                    </Box>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
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
                          <MedicalInformation />
                        </Box>
                        <Typography variant="h6" fontWeight={800}>
                          Membership timeline
                        </Typography>
                      </Stack>

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
                            <Typography variant="body2" color="text.secondary">
                              Plan snapshot: {row.plan_id ? 'Plan assigned' : 'No plan assigned'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Window: {formatDateValue(row.membership_start_date)} → {formatDateValue(row.membership_end_date)}
                            </Typography>
                          </Stack>
                        </Paper>
                      )) : (
                        <Typography color="text.secondary">
                          Your membership status history will appear here as your plan or status changes over time.
                        </Typography>
                      )}
                    </Stack>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
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
                          Waiver activity
                        </Typography>
                      </Stack>

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
                              Recorded from {waiver.recorded_source.replace('_', ' ')}
                            </Typography>
                          </Stack>
                        </Paper>
                      )) : (
                        <Typography color="text.secondary">
                          No liability waiver has been recorded yet.
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
                        <ContactPhone />
                      </Box>
                      <Box>
                        <Typography variant="h6" fontWeight={800}>
                          Why this page matters
                        </Typography>
                        <Typography color="text.secondary">
                          Keeping this page updated helps staff confirm your plan, contact details, waiver status, and
                          renewal timeline without asking you to repeat the same information at the front desk.
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

export default MemberProfilePage;
