import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import QrCode from 'react-qr-code';
import AccessLogsCard from './AccessLogsCard';
import {
  acceptActiveWaiver,
  getMyAccessStatus,
  issueAccessPass,
  listMyAccessEvents,
} from './accessClient';

const expiryOptions = [10, 15, 30, 60];

export default function MemberAccessPassPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [expiresInMinutes, setExpiresInMinutes] = useState(15);
  const [issuing, setIssuing] = useState(false);
  const [acceptingWaiver, setAcceptingWaiver] = useState(false);
  const [passData, setPassData] = useState(null);
  const [hasValidWaiver, setHasValidWaiver] = useState(false);
  const [logs, setLogs] = useState([]);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [status, activity] = await Promise.all([
        getMyAccessStatus(),
        listMyAccessEvents(12),
      ]);
      setHasValidWaiver(Boolean(status.hasValidWaiver));
      setPassData(status.latestPass ? { accessPass: status.latestPass, qrValue: JSON.stringify({ type: 'gym_access_pass', token: status.latestPass.access_token, expiresAt: status.latestPass.expires_at }) } : null);
      setLogs(activity);
    } catch (fetchError) {
      setError(fetchError.message || 'Failed to load access pass details.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const latestPass = passData?.accessPass || null;
  const passExpiry = useMemo(() => (latestPass?.expires_at ? new Date(latestPass.expires_at).toLocaleString() : '—'), [latestPass]);

  const handleAcceptWaiver = async () => {
    setAcceptingWaiver(true);
    setError('');
    setSuccessMessage('');
    try {
      await acceptActiveWaiver();
      setSuccessMessage('Waiver accepted. You can now issue a fresh QR access pass.');
      await loadPage();
    } catch (acceptError) {
      setError(acceptError.message || 'Failed to accept the waiver.');
    } finally {
      setAcceptingWaiver(false);
    }
  };

  const handleIssuePass = async () => {
    setIssuing(true);
    setError('');
    setSuccessMessage('');
    try {
      const result = await issueAccessPass(expiresInMinutes);
      setPassData(result);
      setSuccessMessage('A new QR access pass is ready. Show it at the gate or front desk.');
      await loadPage();
    } catch (issueError) {
      setError(issueError.message || 'Failed to issue the access pass.');
    } finally {
      setIssuing(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
      <Stack spacing={2} mb={3}>
        <Typography variant="h4" fontWeight={800}>
          Digital Access Pass
        </Typography>
        <Typography color="text.secondary">
          Issue a short-lived QR code, keep your waiver up to date, and review your recent gate activity.
        </Typography>
      </Stack>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {successMessage ? <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert> : null}

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6" fontWeight={700}>
                  Access readiness
                </Typography>
                <Alert severity={hasValidWaiver ? 'success' : 'warning'}>
                  {hasValidWaiver
                    ? 'Your current liability waiver is valid.'
                    : 'You need to accept the active liability waiver before the gate can approve your entry.'}
                </Alert>
                {!hasValidWaiver ? (
                  <Button variant="contained" onClick={handleAcceptWaiver} disabled={acceptingWaiver}>
                    {acceptingWaiver ? 'Accepting waiver...' : 'Accept current waiver'}
                  </Button>
                ) : null}
                <Divider />
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
                  <TextField
                    select
                    label="Pass validity"
                    value={expiresInMinutes}
                    onChange={(event) => setExpiresInMinutes(Number(event.target.value))}
                    sx={{ minWidth: 180 }}
                  >
                    {expiryOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option} minutes
                      </MenuItem>
                    ))}
                  </TextField>
                  <Button variant="contained" onClick={handleIssuePass} disabled={issuing || !hasValidWaiver}>
                    {issuing ? 'Generating...' : 'Generate QR access pass'}
                  </Button>
                </Stack>
                {latestPass ? (
                  <Grid container spacing={3} alignItems="center">
                    <Grid item xs={12} md={5}>
                      <Box sx={{ p: 2, bgcolor: '#fff', borderRadius: 2, display: 'inline-block' }}>
                        <QrCode value={passData?.qrValue || latestPass.access_token} size={220} />
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={7}>
                      <Stack spacing={1.5}>
                        <Typography variant="subtitle1" fontWeight={700}>
                          Active pass details
                        </Typography>
                        <Typography variant="body2">Status: {latestPass.status}</Typography>
                        <Typography variant="body2">Expires: {passExpiry}</Typography>
                        <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                          Token: {latestPass.access_token}
                        </Typography>
                        <Alert severity="info">
                          This code is designed for short-lived gate verification. Generate a new one if it expires before you arrive.
                        </Alert>
                      </Stack>
                    </Grid>
                  </Grid>
                ) : (
                  <Alert severity="info">
                    No active access pass has been issued yet.
                  </Alert>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={5}>
          <AccessLogsCard
            title="Recent access activity"
            logs={logs}
            emptyMessage="Once you start checking in, your recent entry decisions will appear here."
          />
        </Grid>
      </Grid>
    </Box>
  );
}
