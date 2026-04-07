
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  BadgeOutlined,
  LockReset,
  PersonOutline,
  VerifiedUser,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

import { PATHS } from '../../app/paths';
import SetupNotice from '../../components/common/SetupNotice';
import LoadingScreen from '../../components/common/LoadingScreen';
import { useAuth } from '../../context/AuthContext';
import {
  formatDateTimeValue,
  getMembershipStatusChipSx,
  getMembershipStatusLabel,
  getWaiverChipSx,
  getWaiverStatusLabel,
} from '../members/memberLifecycle';

const AccountPage = () => {
  const {
    user,
    profile,
    loading,
    isConfigured,
    updateMyProfile,
    updatePassword,
  } = useAuth();

  const [profileForm, setProfileForm] = useState({ fullName: '' });
  const [passwordForm, setPasswordForm] = useState({
    password: '',
    confirmPassword: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState({ type: '', message: '' });
  const [passwordFeedback, setPasswordFeedback] = useState({ type: '', message: '' });

  useEffect(() => {
    setProfileForm({
      fullName: profile?.full_name || '',
    });
  }, [profile?.full_name]);

  if (loading) {
    return <LoadingScreen message="Loading your account..." />;
  }

  const handleProfileFieldChange = (field) => (event) => {
    setProfileForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handlePasswordFieldChange = (field) => (event) => {
    setPasswordForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setProfileFeedback({ type: '', message: '' });

    if (!profileForm.fullName.trim()) {
      setProfileFeedback({ type: 'error', message: 'Full name is required.' });
      return;
    }

    try {
      setProfileSaving(true);
      await updateMyProfile({ fullName: profileForm.fullName });
      setProfileFeedback({ type: 'success', message: 'Account name updated successfully.' });
    } catch (error) {
      setProfileFeedback({
        type: 'error',
        message: error.message || 'Unable to update your account profile.',
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordFeedback({ type: '', message: '' });

    if (passwordForm.password.length < 8) {
      setPasswordFeedback({ type: 'error', message: 'Use at least 8 characters for the new password.' });
      return;
    }

    if (passwordForm.password !== passwordForm.confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    try {
      setPasswordSaving(true);
      const { error } = await updatePassword(passwordForm.password);

      if (error) {
        throw error;
      }

      setPasswordForm({ password: '', confirmPassword: '' });
      setPasswordFeedback({ type: 'success', message: 'Password updated successfully.' });
    } catch (error) {
      setPasswordFeedback({
        type: 'error',
        message: error.message || 'Unable to update your password.',
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <Box sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={1.5} mb={4}>
        <Typography color="#ff2625" fontWeight={700}>
          My account
        </Typography>
        <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '32px', md: '42px' } }}>
          Manage security and sign-in details
        </Typography>
        <Typography color="text.secondary" maxWidth="780px">
          Use this page for account security. Personal details, emergency contacts, and waiver activity now live in
          your dedicated membership profile.
        </Typography>
      </Stack>

      <SetupNotice title="Account settings need Supabase first" />

      {!isConfigured ? null : (
        <Grid container spacing={3}>
          <Grid item xs={12} lg={4}>
            <Stack spacing={3} height="100%">
              <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
                <Stack spacing={2.5}>
                  <Box
                    sx={{
                      width: 68,
                      height: 68,
                      borderRadius: '24px',
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: '#fff0f0',
                      color: '#ff2625',
                    }}
                  >
                    <VerifiedUser />
                  </Box>

                  <Box>
                    <Typography color="#ff2625" fontWeight={700} mb={1}>
                      Signed-in account
                    </Typography>
                    <Typography variant="h5" fontWeight={800}>
                      {profile?.full_name || user?.email || 'Gym member'}
                    </Typography>
                  </Box>

                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                      <Typography color="text.secondary">Role</Typography>
                      <Chip label={profile?.role || 'member'} />
                    </Stack>
                    <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                      <Typography color="text.secondary">Membership</Typography>
                      <Chip
                        label={getMembershipStatusLabel(profile?.membership_status)}
                        sx={getMembershipStatusChipSx(profile?.membership_status)}
                      />
                    </Stack>
                    <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                      <Typography color="text.secondary">Waiver</Typography>
                      <Chip
                        label={getWaiverStatusLabel(profile)}
                        sx={getWaiverChipSx(Boolean(profile?.waiver_signed_at))}
                      />
                    </Stack>
                    <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                      <Typography color="text.secondary">Last waiver activity</Typography>
                      <Typography fontWeight={700} textAlign="right">
                        {formatDateTimeValue(profile?.waiver_signed_at, 'Pending')}
                      </Typography>
                    </Stack>
                  </Stack>

                  <Button
                    component={RouterLink}
                    to={PATHS.membership}
                    variant="outlined"
                    sx={{ textTransform: 'none', borderRadius: 999 }}
                  >
                    Open membership profile
                  </Button>
                </Stack>
              </Paper>

              <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', flex: 1 }}>
                <Stack spacing={1.5}>
                  <Typography color="#ff2625" fontWeight={700}>
                    Where to update member details
                  </Typography>
                  <Typography variant="h6" fontWeight={800}>
                    Membership profile
                  </Typography>
                  <Typography color="text.secondary" lineHeight={1.8}>
                    Update your phone number, address, emergency contact, fitness goals, and waiver acknowledgement on
                    the membership page so your account settings stay focused on security.
                  </Typography>
                  <Button
                    component={RouterLink}
                    to={PATHS.membership}
                    variant="contained"
                    sx={{
                      bgcolor: '#ff2625',
                      textTransform: 'none',
                      borderRadius: 999,
                      alignSelf: 'flex-start',
                      '&:hover': { bgcolor: '#df1d1d' },
                    }}
                  >
                    Go to membership profile
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
                        Account identity
                      </Typography>
                      <Typography color="text.secondary">
                        Keep the name attached to your login up to date.
                      </Typography>
                    </Box>
                  </Stack>

                  {profileFeedback.message ? (
                    <Alert severity={profileFeedback.type || 'info'} sx={{ mb: 3, borderRadius: 3 }}>
                      {profileFeedback.message}
                    </Alert>
                  ) : null}

                  <Box component="form" onSubmit={handleProfileSubmit}>
                    <Stack spacing={2.5}>
                      <TextField
                        label="Full name"
                        value={profileForm.fullName}
                        onChange={handleProfileFieldChange('fullName')}
                        fullWidth
                        required
                      />
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={profileSaving}
                        sx={{
                          bgcolor: '#ff2625',
                          textTransform: 'none',
                          borderRadius: 999,
                          alignSelf: 'flex-start',
                          px: 3,
                          '&:hover': { bgcolor: '#df1d1d' },
                        }}
                      >
                        {profileSaving ? 'Saving...' : 'Save account name'}
                      </Button>
                    </Stack>
                  </Box>
                </Paper>
              </Grid>

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
                      <BadgeOutlined />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight={800}>
                        Account overview
                      </Typography>
                      <Typography color="text.secondary">
                        Quick snapshot of the login tied to your membership.
                      </Typography>
                    </Box>
                  </Stack>

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography color="text.secondary">Email address</Typography>
                      <Typography fontWeight={700}>{user?.email || profile?.email || 'No email found'}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography color="text.secondary">Member since</Typography>
                      <Typography fontWeight={700}>{profile?.member_since ? new Date(profile.member_since).toLocaleDateString() : 'Not set'}</Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

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
                      <LockReset />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight={800}>
                        Password security
                      </Typography>
                      <Typography color="text.secondary">
                        Change your password without leaving the app.
                      </Typography>
                    </Box>
                  </Stack>

                  {passwordFeedback.message ? (
                    <Alert severity={passwordFeedback.type || 'info'} sx={{ mb: 3, borderRadius: 3 }}>
                      {passwordFeedback.message}
                    </Alert>
                  ) : null}

                  <Box component="form" onSubmit={handlePasswordSubmit}>
                    <Stack spacing={2.5}>
                      <TextField
                        label="New password"
                        type="password"
                        value={passwordForm.password}
                        onChange={handlePasswordFieldChange('password')}
                        fullWidth
                        required
                      />
                      <TextField
                        label="Confirm new password"
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordFieldChange('confirmPassword')}
                        fullWidth
                        required
                      />
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={passwordSaving}
                        sx={{
                          bgcolor: '#ff2625',
                          textTransform: 'none',
                          borderRadius: 999,
                          alignSelf: 'flex-start',
                          px: 3,
                          '&:hover': { bgcolor: '#df1d1d' },
                        }}
                      >
                        {passwordSaving ? 'Updating...' : 'Update password'}
                      </Button>
                    </Stack>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default AccountPage;
