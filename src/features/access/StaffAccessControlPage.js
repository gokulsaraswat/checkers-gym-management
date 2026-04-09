import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AccessLogsCard from './AccessLogsCard';
import {
  listAccessPoints,
  listRecentAccessEvents,
  manualAccessDecision,
  verifyAccessPass,
} from './accessClient';

export default function StaffAccessControlPage() {
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [accessPoints, setAccessPoints] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [accessToken, setAccessToken] = useState('');
  const [accessPointId, setAccessPointId] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [memberId, setMemberId] = useState('');
  const [manualDecision, setManualDecision] = useState('allow');
  const [manualReason, setManualReason] = useState('');
  const [loading, setLoading] = useState(true);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [points, logs] = await Promise.all([
        listAccessPoints(),
        listRecentAccessEvents(18),
      ]);
      setAccessPoints(points.filter((point) => point.is_active));
      setRecentLogs(logs);
      if (points.length && !accessPointId) {
        setAccessPointId(points[0].id);
      }
    } catch (fetchError) {
      setError(fetchError.message || 'Failed to load access control data.');
    } finally {
      setLoading(false);
    }
  }, [accessPointId]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const handleVerify = async () => {
    setError('');
    setSuccessMessage('');
    try {
      const result = await verifyAccessPass({
        accessToken,
        accessPointId,
        entryMethod: 'qr',
      });
      setVerifyResult(result);
      setSuccessMessage(result.decision === 'allow' ? 'Entry approved.' : 'Entry denied. Review the reason below.');
      setAccessToken('');
      await loadPage();
    } catch (verifyError) {
      setError(verifyError.message || 'Failed to verify the access token.');
    }
  };

  const handleManualDecision = async () => {
    setError('');
    setSuccessMessage('');
    try {
      await manualAccessDecision({
        userId: memberId,
        accessPointId,
        decision: manualDecision,
        reason: manualReason,
      });
      setSuccessMessage('Manual access decision recorded.');
      setMemberId('');
      setManualReason('');
      await loadPage();
    } catch (manualError) {
      setError(manualError.message || 'Failed to record the manual access decision.');
    }
  };

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
      <Stack spacing={2} mb={3}>
        <Typography variant="h4" fontWeight={800}>
          Staff access control desk
        </Typography>
        <Typography color="text.secondary">
          Verify QR passes, apply manual overrides, and review the latest entry events from the front desk or gate tablet.
        </Typography>
      </Stack>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {successMessage ? <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert> : null}

      <Grid container spacing={3}>
        <Grid item xs={12} xl={7}>
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6" fontWeight={700}>Scan or paste QR token</Typography>
                  <FormControl fullWidth>
                    <InputLabel id="access-point-label">Access point</InputLabel>
                    <Select
                      labelId="access-point-label"
                      label="Access point"
                      value={accessPointId}
                      onChange={(event) => setAccessPointId(event.target.value)}
                      disabled={loading}
                    >
                      {accessPoints.map((point) => (
                        <MenuItem key={point.id} value={point.id}>
                          {point.branch_name} · {point.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Access token"
                    placeholder="Paste scanned token here"
                    value={accessToken}
                    onChange={(event) => setAccessToken(event.target.value)}
                    multiline
                    minRows={2}
                    fullWidth
                  />
                  <Button variant="contained" onClick={handleVerify} disabled={!accessToken.trim() || !accessPointId}>
                    Verify access token
                  </Button>
                  {verifyResult ? (
                    <Alert severity={verifyResult.decision === 'allow' ? 'success' : 'warning'}>
                      {verifyResult.decision === 'allow'
                        ? `${verifyResult.fullName || 'Member'} can enter.${verifyResult.planName ? ` Plan: ${verifyResult.planName}.` : ''}`
                        : verifyResult.reason || 'Entry denied.'}
                    </Alert>
                  ) : null}
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6" fontWeight={700}>Manual override</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Use this only when the QR flow is unavailable. Enter the member profile UUID from admin/member detail pages.
                  </Typography>
                  <TextField
                    label="Member profile id"
                    value={memberId}
                    onChange={(event) => setMemberId(event.target.value)}
                    fullWidth
                  />
                  <FormControl fullWidth>
                    <InputLabel id="manual-decision-label">Decision</InputLabel>
                    <Select
                      labelId="manual-decision-label"
                      value={manualDecision}
                      label="Decision"
                      onChange={(event) => setManualDecision(event.target.value)}
                    >
                      <MenuItem value="allow">Allow</MenuItem>
                      <MenuItem value="deny">Deny</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label="Reason / note"
                    value={manualReason}
                    onChange={(event) => setManualReason(event.target.value)}
                    multiline
                    minRows={2}
                    fullWidth
                  />
                  <Button variant="outlined" onClick={handleManualDecision} disabled={!memberId.trim()}>
                    Save manual access decision
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
        <Grid item xs={12} xl={5}>
          <AccessLogsCard
            title="Recent gate events"
            logs={recentLogs}
            emptyMessage="Access events will appear here after the first scan or manual override."
          />
        </Grid>
      </Grid>
    </Box>
  );
}
