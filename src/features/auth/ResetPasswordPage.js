import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { LockReset, ShieldOutlined } from '@mui/icons-material';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';

import { PATHS } from '../../app/paths';
import SetupNotice from '../../components/common/SetupNotice';
import LoadingScreen from '../../components/common/LoadingScreen';
import { useAuth } from '../../context/AuthContext';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    loading,
    isConfigured,
    updatePassword,
  } = useAuth();

  const [form, setForm] = useState({
    password: '',
    confirmPassword: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const hasRecoveryParams = useMemo(() => {
    const search = new URLSearchParams(location.search);
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''));

    return (
      search.get('type') === 'recovery'
      || hash.get('type') === 'recovery'
      || Boolean(hash.get('access_token'))
      || Boolean(search.get('code'))
    );
  }, [location.hash, location.search]);

  const handleFieldChange = (field) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });

    if (!isConfigured) {
      setFeedback({
        type: 'warning',
        message: 'Add your Supabase environment variables before updating passwords.',
      });
      return;
    }

    if (form.password.length < 8) {
      setFeedback({ type: 'error', message: 'Use at least 8 characters for the new password.' });
      return;
    }

    if (form.password !== form.confirmPassword) {
      setFeedback({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await updatePassword(form.password);

      if (error) {
        throw error;
      }

      setFeedback({
        type: 'success',
        message: 'Password updated successfully. Redirecting to your account...',
      });

      window.setTimeout(() => {
        navigate(PATHS.account, { replace: true });
      }, 1200);
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to update your password.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Checking your recovery session..." />;
  }

  return (
    <Box sx={{ py: { xs: 3, md: 5 } }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper
            className="surface-card"
            sx={{
              p: { xs: 3, md: 4 },
              borderRadius: 4,
              background: 'linear-gradient(135deg, #fff3f4 0%, #ffffff 100%)',
              height: '100%',
            }}
          >
            <Stack spacing={3}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '22px',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: '#fff0f0',
                  color: '#ff2625',
                }}
              >
                <ShieldOutlined />
              </Box>

              <Box>
                <Typography color="#ff2625" fontWeight={700} mb={1}>
                  Security update
                </Typography>
                <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '32px', md: '44px' } }}>
                  Choose a new password
                </Typography>
              </Box>

              <Typography color="text.secondary" lineHeight={1.8}>
                This page works both for password recovery and for members who are already signed in and want to update
                their password manually.
              </Typography>

              {hasRecoveryParams ? (
                <Alert severity="info" sx={{ borderRadius: 3 }}>
                  Recovery link detected. Finish the new password form on this page.
                </Alert>
              ) : null}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper className="surface-card" sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, background: '#fff' }}>
            <SetupNotice title="Password updates need Supabase first" />

            {feedback.message ? (
              <Alert severity={feedback.type || 'info'} sx={{ mb: 3, borderRadius: 3 }}>
                {feedback.message}
              </Alert>
            ) : null}

            {!user ? (
              <Stack spacing={2.5}>
                <Typography variant="h5" fontWeight={800}>
                  Open the recovery email first
                </Typography>
                <Typography color="text.secondary">
                  This page needs an active recovery session. Use the password reset email and return through that link.
                  If you are already signed in elsewhere, you can also change your password from the account page.
                </Typography>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Button
                    component={RouterLink}
                    to={PATHS.forgotPassword}
                    variant="contained"
                    sx={{
                      bgcolor: '#ff2625',
                      textTransform: 'none',
                      borderRadius: 999,
                      px: 3,
                      '&:hover': { bgcolor: '#df1d1d' },
                    }}
                  >
                    Send a new recovery email
                  </Button>

                  <Button
                    component={RouterLink}
                    to={PATHS.auth}
                    variant="outlined"
                    sx={{
                      textTransform: 'none',
                      borderRadius: 999,
                      px: 3,
                      borderColor: '#ff2625',
                      color: '#ff2625',
                    }}
                  >
                    Back to sign in
                  </Button>
                </Stack>
              </Stack>
            ) : (
              <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={2.5}>
                  <Typography variant="h5" fontWeight={800}>
                    Update password
                  </Typography>

                  <TextField
                    label="New password"
                    type="password"
                    value={form.password}
                    onChange={handleFieldChange('password')}
                    fullWidth
                    required
                  />

                  <TextField
                    label="Confirm new password"
                    type="password"
                    value={form.confirmPassword}
                    onChange={handleFieldChange('confirmPassword')}
                    fullWidth
                    required
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<LockReset />}
                    disabled={submitting}
                    sx={{
                      alignSelf: 'flex-start',
                      bgcolor: '#111827',
                      textTransform: 'none',
                      borderRadius: 999,
                      px: 3,
                      '&:hover': { bgcolor: '#030712' },
                    }}
                  >
                    {submitting ? 'Updating...' : 'Save new password'}
                  </Button>
                </Stack>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ResetPasswordPage;
