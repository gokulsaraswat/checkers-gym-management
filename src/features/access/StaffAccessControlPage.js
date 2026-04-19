import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useSearchParams } from 'react-router-dom';

import AccessLogsCard from './AccessLogsCard';
import RfidNfcConsoleCard from './RfidNfcConsoleCard';
import {
  listAccessPoints,
  listRecentAccessEvents,
  manualAccessDecision,
  verifyAccessPass,
} from './accessClient';
import {
  listQrScannerDevices,
  listRelayBridgeDevices,
  queueRelayBridgeCommand,
  resolveQrScannerCredential,
} from './accessHardwareClient';
import {
  buildRelayBridgePreview,
  buildRelayCommandPayload,
  buildRelayCompletionMessage,
  getRelayDefaultPulseMs,
  normalizeRelayPulseMs,
} from './piRelayBridgeHelpers';
import {
  getScannerPreviewMessage,
  normalizeScannerInput,
} from './scannerWorkflowHelpers';
import {
  buildDuplicateValueMessage,
  formatAccessRefreshLabel,
  isRapidRepeatValue,
  normalizeAccessError,
  readBooleanAccessPreference,
  readTextAccessPreference,
  writeAccessPreference,
} from './accessStabilizationHelpers';

function getHeartbeatChipColor(status) {
  if (status === 'online') {
    return 'success';
  }

  if (status === 'warning') {
    return 'warning';
  }

  if (status === 'maintenance') {
    return 'secondary';
  }

  return 'default';
}

function formatDateTime(value) {
  if (!value) {
    return '—';
  }

  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return value;
  }
}

function formatCredentialTypes(credentialTypes) {
  if (!Array.isArray(credentialTypes) || !credentialTypes.length) {
    return 'qr';
  }

  return credentialTypes.join(', ');
}

function buildResultMessage(result) {
  if (!result) {
    return '';
  }

  if (result.decision === 'allow') {
    let message = `${result.fullName || 'Member'} can enter.`;

    if (result.planName) {
      message = `${message} Plan: ${result.planName}.`;
    }

    return message;
  }

  return result.reason || 'Entry denied.';
}

function buildRelayReason(result, selectedAccessPoint) {
  const memberName = result?.fullName || 'member';
  const pointName = selectedAccessPoint?.name || 'selected access point';

  return `Allowed entry relay pulse for ${memberName} at ${pointName}`;
}

export default function StaffAccessControlPage() {
  const [searchParams] = useSearchParams();
  const scannerInputRef = useRef(null);
  const lastVerifiedScanRef = useRef({ token: '', verifiedAt: 0 });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [accessPoints, setAccessPoints] = useState([]);
  const [scannerDevices, setScannerDevices] = useState([]);
  const [relayDevices, setRelayDevices] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [scannerInput, setScannerInput] = useState('');
  const [accessPointId, setAccessPointId] = useState(() => readTextAccessPreference('staff-qr:accessPointId', ''));
  const [scannerDeviceId, setScannerDeviceId] = useState(() => readTextAccessPreference('staff-qr:scannerDeviceId', ''));
  const [relayDeviceId, setRelayDeviceId] = useState(() => readTextAccessPreference('staff-qr:relayDeviceId', ''));
  const [relayPulseMs, setRelayPulseMs] = useState(() => readTextAccessPreference('staff-qr:relayPulseMs', '2500'));
  const [relayDryRun, setRelayDryRun] = useState(() => readBooleanAccessPreference('staff-qr:relayDryRun', false));
  const [verifyResult, setVerifyResult] = useState(null);
  const [relayCommandResult, setRelayCommandResult] = useState(null);
  const [memberId, setMemberId] = useState('');
  const [manualDecision, setManualDecision] = useState('allow');
  const [manualReason, setManualReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastLoadedAt, setLastLoadedAt] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [queueingRelay, setQueueingRelay] = useState(false);
  const [savingManualDecision, setSavingManualDecision] = useState(false);
  const [autoSubmitOnEnter, setAutoSubmitOnEnter] = useState(() => readBooleanAccessPreference('staff-qr:autoSubmitOnEnter', true));
  const [preferHardwareResolver, setPreferHardwareResolver] = useState(() => readBooleanAccessPreference('staff-qr:preferHardwareResolver', true));
  const [autoQueueRelayOnAllow, setAutoQueueRelayOnAllow] = useState(() => readBooleanAccessPreference('staff-qr:autoQueueRelayOnAllow', true));

  const requestedAccessPointId = searchParams.get('accessPointId') || '';
  const requestedDeviceId = searchParams.get('deviceId') || '';
  const requestedRelayDeviceId = searchParams.get('relayDeviceId') || '';

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [points, logs, devices, relayBridgeDevices] = await Promise.all([
        listAccessPoints(),
        listRecentAccessEvents(18),
        listQrScannerDevices(),
        listRelayBridgeDevices(),
      ]);

      setAccessPoints((points || []).filter((point) => point.is_active));
      setRecentLogs(logs || []);
      setScannerDevices(devices || []);
      setRelayDevices(relayBridgeDevices || []);
      setLastLoadedAt(new Date().toISOString());
    } catch (fetchError) {
      setError(normalizeAccessError(fetchError, 'Failed to load access control data.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  useEffect(() => {
    writeAccessPreference('staff-qr:accessPointId', accessPointId || '');
    writeAccessPreference('staff-qr:scannerDeviceId', scannerDeviceId || '');
    writeAccessPreference('staff-qr:relayDeviceId', relayDeviceId || '');
    writeAccessPreference('staff-qr:relayPulseMs', relayPulseMs || '2500');
    writeAccessPreference('staff-qr:relayDryRun', Boolean(relayDryRun));
    writeAccessPreference('staff-qr:autoSubmitOnEnter', Boolean(autoSubmitOnEnter));
    writeAccessPreference('staff-qr:preferHardwareResolver', Boolean(preferHardwareResolver));
    writeAccessPreference('staff-qr:autoQueueRelayOnAllow', Boolean(autoQueueRelayOnAllow));
  }, [
    accessPointId,
    autoQueueRelayOnAllow,
    autoSubmitOnEnter,
    preferHardwareResolver,
    relayDeviceId,
    relayDryRun,
    relayPulseMs,
    scannerDeviceId,
  ]);

  useEffect(() => {
    if (scannerInputRef.current) {
      scannerInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (!accessPoints.length) {
      return;
    }

    const requestedPoint = accessPoints.find((point) => point.id === requestedAccessPointId);

    if (requestedPoint?.id && requestedPoint.id !== accessPointId) {
      setAccessPointId(requestedPoint.id);
      return;
    }

    const hasSelectedAccessPoint = accessPoints.some((point) => point.id === accessPointId);
    if (hasSelectedAccessPoint) {
      return;
    }

    const fallbackPoint = accessPoints[0];

    if (fallbackPoint?.id) {
      setAccessPointId(fallbackPoint.id);
    }
  }, [accessPointId, accessPoints, requestedAccessPointId]);

  useEffect(() => {
    if (!scannerDevices.length) {
      if (scannerDeviceId) {
        setScannerDeviceId('');
      }
      return;
    }

    const requestedDevice = scannerDevices.find((device) => device.id === requestedDeviceId);

    if (requestedDevice?.id && requestedDevice.id !== scannerDeviceId) {
      setScannerDeviceId(requestedDevice.id);
      return;
    }

    const hasSelectedDevice = scannerDevices.some((device) => device.id === scannerDeviceId);
    if (hasSelectedDevice) {
      return;
    }

    const fallbackDevice = scannerDevices[0];

    if (fallbackDevice?.id) {
      setScannerDeviceId(fallbackDevice.id);
    }
  }, [requestedDeviceId, scannerDeviceId, scannerDevices]);

  const selectedAccessPoint = useMemo(
    () => accessPoints.find((point) => point.id === accessPointId) || null,
    [accessPointId, accessPoints],
  );

  const selectedScannerDevice = useMemo(
    () => scannerDevices.find((device) => device.id === scannerDeviceId) || null,
    [scannerDeviceId, scannerDevices],
  );

  useEffect(() => {
    if (accessPointId || !selectedScannerDevice?.access_point_id) {
      return;
    }

    setAccessPointId(selectedScannerDevice.access_point_id);
  }, [accessPointId, selectedScannerDevice]);

  const scanState = useMemo(() => normalizeScannerInput(scannerInput), [scannerInput]);
  const scannerPreviewMessage = useMemo(
    () => getScannerPreviewMessage(scanState),
    [scanState],
  );

  const verificationAccessPointId = selectedAccessPoint?.id || selectedScannerDevice?.access_point_id || '';
  const useHardwareResolver = Boolean(preferHardwareResolver && selectedScannerDevice);

  const relayCandidateDevices = useMemo(() => {
    if (!relayDevices.length) {
      return [];
    }

    const pointMatchedDevices = relayDevices.filter((device) => (
      !verificationAccessPointId || !device.access_point_id || device.access_point_id === verificationAccessPointId
    ));

    if (pointMatchedDevices.length) {
      return pointMatchedDevices;
    }

    return relayDevices;
  }, [relayDevices, verificationAccessPointId]);

  useEffect(() => {
    if (!relayCandidateDevices.length) {
      if (relayDeviceId) {
        setRelayDeviceId('');
      }
      return;
    }

    const requestedRelayDevice = relayCandidateDevices.find((device) => device.id === requestedRelayDeviceId);

    if (requestedRelayDevice?.id && requestedRelayDevice.id !== relayDeviceId) {
      setRelayDeviceId(requestedRelayDevice.id);
      setRelayPulseMs(String(getRelayDefaultPulseMs(requestedRelayDevice)));
      return;
    }

    const hasSelectedRelay = relayCandidateDevices.some((device) => device.id === relayDeviceId);
    if (hasSelectedRelay) {
      return;
    }

    const matchingAccessPointRelay = relayCandidateDevices.find((device) => device.access_point_id === verificationAccessPointId);
    const fallbackRelayDevice = matchingAccessPointRelay || relayCandidateDevices[0];

    if (fallbackRelayDevice?.id) {
      setRelayDeviceId(fallbackRelayDevice.id);
      setRelayPulseMs(String(getRelayDefaultPulseMs(fallbackRelayDevice)));
    }
  }, [relayCandidateDevices, relayDeviceId, requestedRelayDeviceId, verificationAccessPointId]);

  const selectedRelayDevice = useMemo(
    () => relayDevices.find((device) => device.id === relayDeviceId) || null,
    [relayDeviceId, relayDevices],
  );

  const selectedRelayAccessPoint = useMemo(
    () => accessPoints.find((point) => point.id === selectedRelayDevice?.access_point_id) || null,
    [accessPoints, selectedRelayDevice],
  );

  const relayPreviewMessage = useMemo(() => buildRelayBridgePreview({
    relayDevice: selectedRelayDevice,
    accessPoint: selectedAccessPoint || selectedRelayAccessPoint,
    pulseMs: relayPulseMs,
    reason: verifyResult?.decision === 'allow'
      ? buildRelayReason(verifyResult, selectedAccessPoint || selectedRelayAccessPoint)
      : 'Allowed entry relay pulse',
    dryRun: relayDryRun,
  }), [relayDryRun, relayPulseMs, selectedAccessPoint, selectedRelayAccessPoint, selectedRelayDevice, verifyResult]);

  const queueRelayPulseForResult = useCallback(async (result, currentScanState = null, source = 'staff_scanner_workflow') => {
    if (!selectedRelayDevice) {
      return null;
    }

    setQueueingRelay(true);

    try {
      const relayResult = await queueRelayBridgeCommand({
        deviceId: selectedRelayDevice.id,
        accessPointId: verificationAccessPointId || selectedRelayDevice.access_point_id || null,
        commandType: 'pulse',
        pulseMs: normalizeRelayPulseMs(relayPulseMs, getRelayDefaultPulseMs(selectedRelayDevice)),
        reason: buildRelayReason(result, selectedAccessPoint || selectedRelayAccessPoint),
        payload: buildRelayCommandPayload({
          verifyResult: result,
          scanState: currentScanState,
          scannerDevice: selectedScannerDevice,
          accessPoint: selectedAccessPoint || selectedRelayAccessPoint,
          source,
          dryRun: relayDryRun,
        }),
        dryRun: relayDryRun,
      });

      setRelayCommandResult(relayResult);
      return relayResult;
    } finally {
      setQueueingRelay(false);
    }
  }, [relayDryRun, relayPulseMs, selectedAccessPoint, selectedRelayAccessPoint, selectedRelayDevice, selectedScannerDevice, verificationAccessPointId]);

  let verifyButtonLabel = 'Validate QR access';
  if (verifying) {
    verifyButtonLabel = 'Validating...';
  } else if (useHardwareResolver) {
    verifyButtonLabel = 'Validate through scanner device';
  }

  const relayButtonLabel = queueingRelay ? 'Queueing relay...' : 'Queue relay pulse';

  const handleVerify = async () => {
    const cleanedToken = scanState.token;

    if (!cleanedToken) {
      setError('Scan a QR token or paste a supported scanner payload before validating.');
      return;
    }

    if (!verificationAccessPointId) {
      setError('Select an access point or scanner device mapped to an access point before validating.');
      return;
    }

    if (isRapidRepeatValue({
      previousValue: lastVerifiedScanRef.current.token,
      nextValue: cleanedToken,
      previousTimestamp: lastVerifiedScanRef.current.verifiedAt,
      cooldownMs: 2500,
    })) {
      setError(buildDuplicateValueMessage('qr'));
      return;
    }

    const previousScanRef = lastVerifiedScanRef.current;

    lastVerifiedScanRef.current = {
      token: cleanedToken,
      verifiedAt: Date.now(),
    };

    setVerifying(true);
    setError('');
    setSuccessMessage('');

    try {
      let result;

      if (useHardwareResolver) {
        result = await resolveQrScannerCredential({
          deviceId: selectedScannerDevice.id,
          accessPointId: verificationAccessPointId,
          accessToken: cleanedToken,
          payload: {
            rawScan: scanState.rawValue,
            detectedFrom: scanState.detectedFrom,
            source: 'staff_scanner_workflow',
          },
        });
      } else {
        result = await verifyAccessPass({
          accessToken: cleanedToken,
          accessPointId: verificationAccessPointId,
          entryMethod: 'qr',
        });
      }

      let message = result.decision === 'allow'
        ? 'Entry approved.'
        : 'Entry denied. Review the reason below.';
      let relayQueueErrorMessage = '';

      setRelayCommandResult(null);

      if (result.decision === 'allow' && autoQueueRelayOnAllow && selectedRelayDevice) {
        try {
          const relayResult = await queueRelayPulseForResult(result, scanState, 'staff_scanner_auto_relay');
          const relayMessage = buildRelayCompletionMessage(relayResult, selectedRelayDevice);
          if (relayMessage) {
            message = `${message} ${relayMessage}`;
          }
        } catch (relayError) {
          message = 'Entry approved, but the relay bridge queue failed.';
          relayQueueErrorMessage = normalizeAccessError(relayError, 'Entry approved, but the relay pulse could not be queued.');
        }
      }

      setVerifyResult(result);
      setSuccessMessage(message);
      setScannerInput('');
      await loadPage();

      if (relayQueueErrorMessage) {
        setError(relayQueueErrorMessage);
      }

      if (scannerInputRef.current) {
        scannerInputRef.current.focus();
      }
    } catch (verifyError) {
      lastVerifiedScanRef.current = previousScanRef;
      setError(normalizeAccessError(verifyError, 'Failed to verify the access token.'));
    } finally {
      setVerifying(false);
    }
  };

  const handleManualDecision = async () => {
    setSavingManualDecision(true);
    setError('');
    setSuccessMessage('');

    try {
      await manualAccessDecision({
        userId: memberId.trim(),
        accessPointId: verificationAccessPointId || null,
        decision: manualDecision,
        reason: manualReason.trim(),
      });
      setSuccessMessage('Manual access decision recorded.');
      setMemberId('');
      setManualReason('');
      await loadPage();
    } catch (manualError) {
      setError(normalizeAccessError(manualError, 'Failed to record the manual access decision.'));
    } finally {
      setSavingManualDecision(false);
    }
  };

  const handleManualRelayQueue = async () => {
    if (verifyResult?.decision !== 'allow') {
      setError('Complete an allowed scan before queueing a relay pulse from this console.');
      return;
    }

    if (!selectedRelayDevice) {
      setError('Choose a relay bridge device before queueing a pulse.');
      return;
    }

    setError('');
    setSuccessMessage('');

    try {
      const relayResult = await queueRelayPulseForResult(verifyResult, null, 'staff_manual_relay_retry');
      setSuccessMessage(buildRelayCompletionMessage(relayResult, selectedRelayDevice) || 'Relay pulse queued.');
      await loadPage();
    } catch (relayError) {
      setError(normalizeAccessError(relayError, 'Failed to queue the relay pulse.'));
    }
  };

  const handleScannerInputKeyDown = (event) => {
    if (!autoSubmitOnEnter || event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    handleVerify();
  };

  const selectedDeviceLabel = selectedScannerDevice
    ? `${selectedScannerDevice.device_name} (${selectedScannerDevice.device_key})`
    : 'Software verification only';

  const selectedRelayDeviceLabel = selectedRelayDevice
    ? `${selectedRelayDevice.device_name} (${selectedRelayDevice.device_key})`
    : 'No relay bridge device selected';

  const selectedAccessPointLabel = selectedAccessPoint
    ? `${selectedAccessPoint.branch_name} · ${selectedAccessPoint.name}`
    : 'No access point selected';

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        mb={3}
      >
        <Stack spacing={1}>
          <Typography variant="h4" fontWeight={800}>
            QR scanner workflow
          </Typography>
          <Typography color="text.secondary">
            Run a front-desk or gate validation workflow with a keyboard-wedge scanner, pasted QR payload, or a registered scanner device from the hardware layer, then queue a Raspberry Pi relay pulse after approved entry.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatAccessRefreshLabel(lastLoadedAt, 'Waiting for the first scanner workflow sync.')}
          </Typography>
        </Stack>
        <Button variant="outlined" onClick={loadPage} disabled={loading || verifying || queueingRelay || savingManualDecision}>
          Refresh logs
        </Button>
      </Stack>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {successMessage ? <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert> : null}

      <Grid container spacing={3}>
        <Grid item xs={12} xl={7}>
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Stack spacing={2.5}>
                  <Box>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                      Live check-in console
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Keep this field focused for scanner input. If your scanner appends an Enter key, enable auto-submit to validate immediately after each scan.
                    </Typography>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
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
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel id="scanner-device-label">Scanner device</InputLabel>
                        <Select
                          labelId="scanner-device-label"
                          label="Scanner device"
                          value={scannerDeviceId}
                          onChange={(event) => setScannerDeviceId(event.target.value)}
                          disabled={loading || !scannerDevices.length}
                        >
                          <MenuItem value="">Software verification only</MenuItem>
                          {scannerDevices.map((device) => (
                            <MenuItem key={device.id} value={device.id}>
                              {device.device_name} · {device.branch_name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel id="relay-device-label">Relay bridge device</InputLabel>
                        <Select
                          labelId="relay-device-label"
                          label="Relay bridge device"
                          value={relayDeviceId}
                          onChange={(event) => {
                            const nextRelayDeviceId = event.target.value;
                            const nextRelayDevice = relayDevices.find((device) => device.id === nextRelayDeviceId) || null;
                            setRelayDeviceId(nextRelayDeviceId);
                            if (nextRelayDevice) {
                              setRelayPulseMs(String(getRelayDefaultPulseMs(nextRelayDevice)));
                            }
                          }}
                          disabled={loading || !relayCandidateDevices.length}
                        >
                          <MenuItem value="">No relay pulse</MenuItem>
                          {relayCandidateDevices.map((device) => (
                            <MenuItem key={device.id} value={device.id}>
                              {device.device_name} · {device.branch_name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Relay pulse (ms)"
                        value={relayPulseMs}
                        onChange={(event) => setRelayPulseMs(event.target.value)}
                        inputProps={{ min: 300, max: 15000, step: 100 }}
                        disabled={!selectedRelayDevice}
                      />
                    </Grid>
                  </Grid>

                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap>
                    <FormControlLabel
                      control={(
                        <Switch
                          checked={autoSubmitOnEnter}
                          onChange={(event) => setAutoSubmitOnEnter(event.target.checked)}
                        />
                      )}
                      label="Auto-submit on Enter"
                    />
                    <FormControlLabel
                      control={(
                        <Switch
                          checked={preferHardwareResolver}
                          onChange={(event) => setPreferHardwareResolver(event.target.checked)}
                          disabled={!scannerDevices.length}
                        />
                      )}
                      label="Use hardware resolver when a scanner device is selected"
                    />
                    <FormControlLabel
                      control={(
                        <Switch
                          checked={autoQueueRelayOnAllow}
                          onChange={(event) => setAutoQueueRelayOnAllow(event.target.checked)}
                          disabled={!selectedRelayDevice}
                        />
                      )}
                      label="Queue relay pulse on allow"
                    />
                    <FormControlLabel
                      control={(
                        <Switch
                          checked={relayDryRun}
                          onChange={(event) => setRelayDryRun(event.target.checked)}
                          disabled={!selectedRelayDevice}
                        />
                      )}
                      label="Dry-run relay"
                    />
                  </Stack>

                  <TextField
                    inputRef={scannerInputRef}
                    label="Scanned QR payload"
                    placeholder='Paste a raw token or JSON payload like {"token":"..."}'
                    value={scannerInput}
                    onChange={(event) => setScannerInput(event.target.value)}
                    onKeyDown={handleScannerInputKeyDown}
                    multiline
                    minRows={3}
                    fullWidth
                  />

                  <Alert severity="info">
                    {scannerPreviewMessage}
                  </Alert>

                  {selectedRelayDevice ? (
                    <Alert severity={relayDryRun ? 'warning' : 'info'}>
                      {relayPreviewMessage}
                    </Alert>
                  ) : null}

                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                    <Button
                      variant="contained"
                      onClick={handleVerify}
                      disabled={verifying || !scanState.token || !verificationAccessPointId}
                    >
                      {verifyButtonLabel}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setScannerInput('');
                        setVerifyResult(null);
                        setRelayCommandResult(null);
                        if (scannerInputRef.current) {
                          scannerInputRef.current.focus();
                        }
                      }}
                      disabled={verifying && !scannerInput}
                    >
                      Clear scan buffer
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleManualRelayQueue}
                      disabled={queueingRelay || verifyResult?.decision !== 'allow' || !selectedRelayDevice}
                    >
                      {relayButtonLabel}
                    </Button>
                  </Stack>

                  {verifyResult ? (
                    <Alert severity={verifyResult.decision === 'allow' ? 'success' : 'warning'}>
                      {buildResultMessage(verifyResult)}
                    </Alert>
                  ) : null}
                  {relayCommandResult ? (
                    <Alert severity={relayDryRun ? 'warning' : 'success'}>
                      {buildRelayCompletionMessage(relayCommandResult, selectedRelayDevice)}
                    </Alert>
                  ) : null}
                </Stack>
              </CardContent>
            </Card>

            <RfidNfcConsoleCard onActivityRecorded={loadPage} />

            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6" fontWeight={700}>
                    Manual override fallback
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Use this only when the QR workflow is unavailable. Enter the member profile UUID from admin or member detail screens.
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
                  <Button
                    variant="outlined"
                    onClick={handleManualDecision}
                    disabled={savingManualDecision || !memberId.trim()}
                  >
                    {savingManualDecision ? 'Saving override...' : 'Save manual access decision'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
        <Grid item xs={12} xl={5}>
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6" fontWeight={700}>
                    Scanner status
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip label={`${scannerDevices.length} QR-ready device${scannerDevices.length === 1 ? '' : 's'}`} color="primary" size="small" />
                    <Chip label={`${relayDevices.length} relay target${relayDevices.length === 1 ? '' : 's'}`} color="secondary" size="small" />
                    <Chip label={selectedAccessPointLabel} variant="outlined" size="small" />
                  </Stack>
                  <Divider />
                  <Typography variant="body2">
                    Selected scanner: {selectedDeviceLabel}
                  </Typography>
                  <Typography variant="body2">
                    Selected relay: {selectedRelayDeviceLabel}
                  </Typography>
                  {selectedScannerDevice ? (
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip
                          label={(selectedScannerDevice.heartbeat_status || 'offline').toUpperCase()}
                          color={getHeartbeatChipColor(selectedScannerDevice.heartbeat_status)}
                          size="small"
                        />
                        <Chip
                          label={selectedScannerDevice.is_active ? 'ACTIVE' : 'INACTIVE'}
                          color={selectedScannerDevice.is_active ? 'success' : 'default'}
                          size="small"
                          variant={selectedScannerDevice.is_active ? 'filled' : 'outlined'}
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Credentials: {formatCredentialTypes(selectedScannerDevice.credential_types)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Last heartbeat: {formatDateTime(selectedScannerDevice.last_seen_at)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Mode: {selectedScannerDevice.integration_mode || 'bridge'}
                      </Typography>
                    </Stack>
                  ) : (
                    <Alert severity="info">
                      No scanner device selected. The page will verify tokens directly through the software flow.
                    </Alert>
                  )}
                  {selectedRelayDevice ? (
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip label={(selectedRelayDevice.relay_behavior || 'none').toUpperCase()} color="secondary" size="small" />
                        <Chip label={relayDryRun ? 'DRY RUN' : 'LIVE PULSE'} color={relayDryRun ? 'warning' : 'success'} size="small" variant="outlined" />
                        <Chip label={autoQueueRelayOnAllow ? 'AUTO QUEUE ON' : 'AUTO QUEUE OFF'} size="small" variant="outlined" />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Last heartbeat: {formatDateTime(selectedRelayDevice.last_seen_at)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Mode: {selectedRelayDevice.integration_mode || 'bridge'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Relay pulse: {normalizeRelayPulseMs(relayPulseMs, getRelayDefaultPulseMs(selectedRelayDevice))} ms
                      </Typography>
                    </Stack>
                  ) : (
                    <Alert severity="info">
                      No relay bridge device selected. Approved scans will not queue a Raspberry Pi relay pulse.
                    </Alert>
                  )}
                  {!scannerDevices.length ? (
                    <Alert severity="info">
                      No QR-ready hardware devices are registered yet. You can still run the desk workflow in software-only mode.
                    </Alert>
                  ) : null}
                  {!relayDevices.length ? (
                    <Alert severity="info">
                      No relay targets are registered yet. Patch 27.2 expects a bridge-mode relay or controller device before door pulses can be queued.
                    </Alert>
                  ) : null}
                </Stack>
              </CardContent>
            </Card>

            <AccessLogsCard
              title="Recent gate events"
              logs={recentLogs}
              emptyMessage="Access events will appear here after the first scan or manual override."
            />
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
