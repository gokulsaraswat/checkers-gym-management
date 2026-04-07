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

import SetupNotice from '../../components/common/SetupNotice';
import LoadingScreen from '../../components/common/LoadingScreen';
import { useAuth } from '../../context/AuthContext';

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
      setProfileFeedback({ type: 'success', message: 'Profile updated successfully.' });
    } catch (error) {
      setProfileFeedback({
        type: 'error',
        message: error.message || 'Unable to update your profile.',
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
          Manage your profile and security
        </Typography>
        <Typography color="text.secondary" maxWidth="780px">
          Keep your profile details up to date and change your password without leaving the app.
        </Typography>
      </Stack>

      <SetupNotice title="Account settings need Supabase first" />

      {!isConfigured ? null : (
        <Grid container spacing={3}>
          <Grid item xs={12} lg={4}>
            <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
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
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <BadgeOutlined color="error" />
                    <Typography color="text.secondary">{user?.email || 'No email found'}</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <PersonOutline color="error" />
                    <Typography color="text.secondary">
                      Role: <strong>{profile?.role || 'member'}</strong>
                    </Typography>
                  </Stack>
                </Stack>

                <Stack direction="row" spacing={1.25} flexWrap="wrap">
                  {profile?.is_active ? (
                    <Chip label="Active account" sx={{ bgcolor: '#ecfdf3', color: '#027a48', fontWeight: 700 }} />
                  ) : (
                    <Chip label="Inactive account" sx={{ bgcolor: '#fff3f4', color: '#ff2625', fontWeight: 700 }} />
                  )}

                  {profile?.plan?.name ? (
                    <Chip label={`Plan: ${profile.plan.name}`} sx={{ bgcolor: '#fff7ed', color: '#c2410c', fontWeight: 700 }} />
                  ) : (
                    <Chip label="No plan assigned yet" sx={{ bgcolor: '#f5f5f5', color: '#374151', fontWeight: 700 }} />
                  )}
                </Stack>

                <Typography color="text.secondary">
                  Member since {profile?.member_since ? new Date(profile.member_since).toLocaleDateString() : '—'}
                </Typography>
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={8}>
            <Stack spacing={3}>
              <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
                <Stack spacing={1.5} mb={3}>
                  <Typography color="#ff2625" fontWeight={700}>
                    Profile details
                  </Typography>
                  <Typography variant="h5" fontWeight={800}>
                    Update the basics
                  </Typography>
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

                    <TextField
                      label="Email"
                      value={user?.email || ''}
                      fullWidth
                      disabled
                      helperText="Email changes can be added in a later patch."
                    />

                    <Button
                      type="submit"
                      variant="contained"
                      disabled={profileSaving}
                      sx={{
                        alignSelf: 'flex-start',
                        bgcolor: '#ff2625',
                        textTransform: 'none',
                        borderRadius: 999,
                        px: 3,
                        '&:hover': { bgcolor: '#df1d1d' },
                      }}
                    >
                      {profileSaving ? 'Saving...' : 'Save profile'}
                    </Button>
                  </Stack>
                </Box>
              </Paper>

              <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
                <Stack spacing={1.5} mb={3}>
                  <Typography color="#ff2625" fontWeight={700}>
                    Security
                  </Typography>
                  <Typography variant="h5" fontWeight={800}>
                    Change your password
                  </Typography>
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
                      startIcon={<LockReset />}
                      disabled={passwordSaving}
                      sx={{
                        alignSelf: 'flex-start',
                        bgcolor: '#111827',
                        textTransform: 'none',
                        borderRadius: 999,
                        px: 3,
                        '&:hover': { bgcolor: '#030712' },
                      }}
                    >
                      {passwordSaving ? 'Updating...' : 'Update password'}
                    </Button>
                  </Stack>
                </Box>
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default AccountPage;
