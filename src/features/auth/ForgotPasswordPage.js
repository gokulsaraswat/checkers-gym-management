import React, { useState } from 'react';
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
import { EmailOutlined, LockReset } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

import { PATHS } from '../../app/paths';
import SetupNotice from '../../components/common/SetupNotice';
import { useAuth } from '../../context/AuthContext';

const ForgotPasswordPage = () => {
  const { isConfigured, sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });

    if (!isConfigured) {
      setFeedback({
        type: 'warning',
        message: 'Add your Supabase environment variables before using password recovery.',
      });
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await sendPasswordReset(email.trim());

      if (error) {
        throw error;
      }

      setFeedback({
        type: 'success',
        message: 'Password reset email sent. Open the link from your inbox to choose a new password.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to send a password reset email.',
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
                <LockReset />
              </Box>

              <Box>
                <Typography color="#ff2625" fontWeight={700} mb={1}>
                  Password recovery
                </Typography>
                <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '32px', md: '44px' } }}>
                  Reset access safely
                </Typography>
              </Box>

              <Typography color="text.secondary" lineHeight={1.8}>
                Send a recovery email to the account owner. After clicking the email link, the user will be returned to
                the app to set a new password.
              </Typography>

              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <EmailOutlined color="error" />
                  <Typography color="text.secondary">Works with Supabase email + password auth</Typography>
                </Stack>
              </Stack>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper className="surface-card" sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, background: '#fff' }}>
            <SetupNotice title="Password recovery needs Supabase first" />

            <Stack spacing={1.5} mb={3}>
              <Typography variant="h5" fontWeight={800}>
                Send a reset email
              </Typography>
              <Typography color="text.secondary">
                Use the same email address that was used to create the account.
              </Typography>
            </Stack>

            {feedback.message ? (
              <Alert severity={feedback.type || 'info'} sx={{ mb: 3, borderRadius: 3 }}>
                {feedback.message}
              </Alert>
            ) : null}

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  fullWidth
                  required
                />

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={submitting}
                    sx={{
                      bgcolor: '#ff2625',
                      textTransform: 'none',
                      borderRadius: 999,
                      py: 1.5,
                      px: 3,
                      '&:hover': { bgcolor: '#df1d1d' },
                    }}
                  >
                    {submitting ? 'Sending...' : 'Send reset email'}
                  </Button>

                  <Button
                    component={RouterLink}
                    to={PATHS.auth}
                    variant="outlined"
                    sx={{
                      textTransform: 'none',
                      borderRadius: 999,
                      py: 1.5,
                      px: 3,
                      borderColor: '#ff2625',
                      color: '#ff2625',
                    }}
                  >
                    Back to sign in
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ForgotPasswordPage;
