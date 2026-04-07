import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Grid,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { FitnessCenter, LockOutlined, PersonOutline } from '@mui/icons-material';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';

import { getSafeAuthRedirectPath } from '../../app/auth/access';
import { PATHS } from '../../app/paths';
import SetupNotice from '../../components/common/SetupNotice';
import { useAuth } from '../../context/AuthContext';

const initialState = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    signIn,
    signUp,
    isConfigured,
  } = useAuth();

  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const title = useMemo(() => (
    mode === 'signin' ? 'Welcome back' : 'Create your gym account'
  ), [mode]);

  const handleChange = (field) => (event) => {
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
        message: 'Add your Supabase environment variables before using authentication.',
      });
      return;
    }

    if (mode === 'signup' && form.password !== form.confirmPassword) {
      setFeedback({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    try {
      setSubmitting(true);

      if (mode === 'signin') {
        const { error, profile } = await signIn({
          email: form.email,
          password: form.password,
        });

        if (error) {
          throw error;
        }

        navigate(getSafeAuthRedirectPath(profile?.role, location.state?.from), { replace: true });
      } else {
        const { data, error, profile } = await signUp({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
        });

        if (error) {
          throw error;
        }

        setForm(initialState);

        if (data?.session) {
          setFeedback({ type: 'success', message: 'Account created. Redirecting to your gym workspace...' });
          navigate(getSafeAuthRedirectPath(profile?.role, location.state?.from), { replace: true });
        } else {
          setFeedback({
            type: 'success',
            message: 'Account created. Check your email to confirm the signup if confirmations are enabled.',
          });
        }
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Authentication failed.',
      });
    } finally {
      setSubmitting(false);
    }
  };

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
                <FitnessCenter />
              </Box>

              <Box>
                <Typography color="#ff2625" fontWeight={700} mb={1}>
                  Gym access portal
                </Typography>
                <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '32px', md: '44px' } }}>
                  {title}
                </Typography>
              </Box>

              <Typography color="text.secondary" lineHeight={1.8}>
                Members use this page to log in, view their assigned plan, and track workouts.
                Admins and staff can sign in here too and will automatically land in the right workspace based on role.
              </Typography>

              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <PersonOutline color="error" />
                  <Typography color="text.secondary">Member, staff, and admin aware sign-in</Typography>
                </Stack>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <LockOutlined color="error" />
                  <Typography color="text.secondary">Supabase email + password auth</Typography>
                </Stack>
              </Stack>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper className="surface-card" sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, background: '#fff' }}>
            <SetupNotice title="Authentication needs Supabase first" />

            <Tabs
              value={mode}
              onChange={(_event, value) => setMode(value)}
              sx={{ mb: 3 }}
            >
              <Tab label="Sign in" value="signin" />
              <Tab label="Sign up" value="signup" />
            </Tabs>

            {feedback.message ? (
              <Alert severity={feedback.type || 'info'} sx={{ mb: 3, borderRadius: 3 }}>
                {feedback.message}
              </Alert>
            ) : null}

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                {mode === 'signup' ? (
                  <TextField
                    label="Full name"
                    value={form.fullName}
                    onChange={handleChange('fullName')}
                    fullWidth
                    required
                  />
                ) : null}

                <TextField
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={handleChange('email')}
                  fullWidth
                  required
                />

                <TextField
                  label="Password"
                  type="password"
                  value={form.password}
                  onChange={handleChange('password')}
                  fullWidth
                  required
                />

                {mode === 'signup' ? (
                  <TextField
                    label="Confirm password"
                    type="password"
                    value={form.confirmPassword}
                    onChange={handleChange('confirmPassword')}
                    fullWidth
                    required
                  />
                ) : null}

                {mode === 'signin' ? (
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Forgot your password?
                    </Typography>
                    <Button
                      component={RouterLink}
                      to={PATHS.forgotPassword}
                      size="small"
                      sx={{
                        textTransform: 'none',
                        color: '#ff2625',
                        fontWeight: 700,
                      }}
                    >
                      Reset it
                    </Button>
                  </Stack>
                ) : null}

                <Button
                  type="submit"
                  variant="contained"
                  disabled={submitting}
                  sx={{
                    mt: 1,
                    bgcolor: '#ff2625',
                    textTransform: 'none',
                    borderRadius: 999,
                    py: 1.5,
                    fontSize: '16px',
                    '&:hover': { bgcolor: '#df1d1d' },
                  }}
                >
                  {(() => {
                    if (submitting) {
                      return 'Please wait...';
                    }

                    return mode === 'signin' ? 'Sign in' : 'Create account';
                  })()}
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AuthPage;
