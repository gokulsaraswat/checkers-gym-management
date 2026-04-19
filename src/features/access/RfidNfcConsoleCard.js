import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useSearchParams } from 'react-router-dom';

import { listAccessPoints } from './accessClient';
import {
  listRelayBridgeDevices,
  listRfidNfcReaderDevices,
  queueRelayBridgeCommand,
  resolveRfidNfcCredential,
} from './accessHardwareClient';
import {
  buildRelayBridgePreview,
  buildRelayCommandPayload,
  buildRelayCompletionMessage,
  getRelayDefaultPulseMs,
  normalizeRelayPulseMs,
} from './piRelayBridgeHelpers';
import {
  formatCredentialValueMask,
  getCredentialTypeLabel,
  getRfidNfcPreviewMessage,
  normalizeCredentialType,
  normalizeRfidNfcInput,
} from './rfidNfcHelpers';
import {
  buildDuplicateValueMessage,
  formatAccessRefreshLabel,
  isRapidRepeatValue,
  normalizeAccessError,
  readBooleanAccessPreference,
  readTextAccessPreference,
  writeAccessPreference,
} from './accessStabilizationHelpers';

const credentialTypeOptions = [
  { value: 'card_uid', label: 'RFID / NFC UID' },
  { value: 'rfid_uid', label: 'RFID UID' },
  { value: 'nfc_uid', label: 'NFC UID' },
];

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
    return 'card_uid';
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

    if (result.credentialSuffix) {
      message = `${message} Credential: ${formatCredentialValueMask(result.credentialSuffix)}.`;
    }

    return message;
  }

  return result.reason || 'Credential denied.';
}

function buildRelayReason(result, selectedAccessPoint) {
  const memberName = result?.fullName || 'member';
  const pointName = selectedAccessPoint?.name || 'selected access point';

  return `Allowed RFID / NFC entry relay pulse for ${memberName} at ${pointName}`;
}

export default function RfidNfcConsoleCard({ onActivityRecorded = null }) {
  const [searchParams] = useSearchParams();
  const credentialInputRef = useRef(null);
  const lastVerifiedCredentialRef = useRef({ token: '', verifiedAt: 0 });
  const [loading, setLoading] = useState(true);
  const [lastLoadedAt, setLastLoadedAt] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [queueingRelay, setQueueingRelay] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [accessPoints, setAccessPoints] = useState([]);
  const [readerDevices, setReaderDevices] = useState([]);
  const [relayDevices, setRelayDevices] = useState([]);
  const [accessPointId, setAccessPointId] = useState(() => readTextAccessPreference('rfid-console:accessPointId', ''));
  const [readerDeviceId, setReaderDeviceId] = useState(() => readTextAccessPreference('rfid-console:readerDeviceId', ''));
  const [relayDeviceId, setRelayDeviceId] = useState(() => readTextAccessPreference('rfid-console:relayDeviceId', ''));
  const [relayPulseMs, setRelayPulseMs] = useState(() => readTextAccessPreference('rfid-console:relayPulseMs', '2500'));
  const [relayDryRun, setRelayDryRun] = useState(() => readBooleanAccessPreference('rfid-console:relayDryRun', true));
  const [autoQueueRelayOnAllow, setAutoQueueRelayOnAllow] = useState(() => readBooleanAccessPreference('rfid-console:autoQueueRelayOnAllow', true));
  const [autoSubmitOnEnter, setAutoSubmitOnEnter] = useState(() => readBooleanAccessPreference('rfid-console:autoSubmitOnEnter', true));
  const [preferHardwareResolver, setPreferHardwareResolver] = useState(() => readBooleanAccessPreference('rfid-console:preferHardwareResolver', true));
  const [credentialType, setCredentialType] = useState(() => readTextAccessPreference('rfid-console:credentialType', 'card_uid') || 'card_uid');
  const [credentialInput, setCredentialInput] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [relayCommandResult, setRelayCommandResult] = useState(null);

  const requestedAccessPointId = searchParams.get('accessPointId') || '';
  const requestedReaderDeviceId = searchParams.get('readerDeviceId') || searchParams.get('deviceId') || '';
  const requestedRelayDeviceId = searchParams.get('relayDeviceId') || '';

  const loadCardData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [points, readerRows, relayRows] = await Promise.all([
        listAccessPoints(),
        listRfidNfcReaderDevices(),
        listRelayBridgeDevices(),
      ]);

      setAccessPoints((points || []).filter((point) => point.is_active));
      setReaderDevices(readerRows || []);
      setRelayDevices(relayRows || []);
      setLastLoadedAt(new Date().toISOString());
    } catch (fetchError) {
      setError(normalizeAccessError(fetchError, 'Failed to load RFID / NFC console data.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCardData();
  }, [loadCardData]);

  useEffect(() => {
    writeAccessPreference('rfid-console:accessPointId', accessPointId || '');
    writeAccessPreference('rfid-console:readerDeviceId', readerDeviceId || '');
    writeAccessPreference('rfid-console:relayDeviceId', relayDeviceId || '');
    writeAccessPreference('rfid-console:relayPulseMs', relayPulseMs || '2500');
    writeAccessPreference('rfid-console:relayDryRun', Boolean(relayDryRun));
    writeAccessPreference('rfid-console:autoQueueRelayOnAllow', Boolean(autoQueueRelayOnAllow));
    writeAccessPreference('rfid-console:autoSubmitOnEnter', Boolean(autoSubmitOnEnter));
    writeAccessPreference('rfid-console:preferHardwareResolver', Boolean(preferHardwareResolver));
    writeAccessPreference('rfid-console:credentialType', credentialType || 'card_uid');
  }, [
    accessPointId,
    autoQueueRelayOnAllow,
    autoSubmitOnEnter,
    credentialType,
    preferHardwareResolver,
    readerDeviceId,
    relayDeviceId,
    relayDryRun,
    relayPulseMs,
  ]);

  useEffect(() => {
    if (credentialInputRef.current) {
      credentialInputRef.current.focus();
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
    if (!readerDevices.length) {
      if (readerDeviceId) {
        setReaderDeviceId('');
      }
      return;
    }

    const requestedReader = readerDevices.find((device) => device.id === requestedReaderDeviceId);

    if (requestedReader?.id && requestedReader.id !== readerDeviceId) {
      setReaderDeviceId(requestedReader.id);
      return;
    }

    const hasSelectedReader = readerDevices.some((device) => device.id === readerDeviceId);
    if (hasSelectedReader) {
      return;
    }

    const fallbackReader = readerDevices[0];

    if (fallbackReader?.id) {
      setReaderDeviceId(fallbackReader.id);
    }
  }, [readerDeviceId, readerDevices, requestedReaderDeviceId]);

  const selectedAccessPoint = useMemo(
    () => accessPoints.find((point) => point.id === accessPointId) || null,
    [accessPointId, accessPoints],
  );

  const selectedReaderDevice = useMemo(
    () => readerDevices.find((device) => device.id === readerDeviceId) || null,
    [readerDeviceId, readerDevices],
  );

  useEffect(() => {
    if (accessPointId || !selectedReaderDevice?.access_point_id) {
      return;
    }

    setAccessPointId(selectedReaderDevice.access_point_id);
  }, [accessPointId, selectedReaderDevice]);

  useEffect(() => {
    const configuredType = normalizeCredentialType(
      selectedReaderDevice?.config?.credentialType || selectedReaderDevice?.config?.credential_type,
    );

    if (configuredType) {
      setCredentialType(configuredType);
    }
  }, [selectedReaderDevice]);

  const verificationAccessPointId = selectedAccessPoint?.id || selectedReaderDevice?.access_point_id || '';
  const scanState = useMemo(() => normalizeRfidNfcInput(credentialInput), [credentialInput]);
  const scanPreviewMessage = useMemo(
    () => getRfidNfcPreviewMessage(scanState),
    [scanState],
  );
  const useHardwareResolver = Boolean(preferHardwareResolver && selectedReaderDevice);

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
      : 'Allowed RFID / NFC entry relay pulse',
    dryRun: relayDryRun,
  }), [relayDryRun, relayPulseMs, selectedAccessPoint, selectedRelayAccessPoint, selectedRelayDevice, verifyResult]);

  const queueRelayPulseForResult = useCallback(async (result, currentScanState = null, source = 'staff_rfid_nfc_console') => {
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
          scannerDevice: selectedReaderDevice,
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
  }, [relayDryRun, relayPulseMs, selectedAccessPoint, selectedReaderDevice, selectedRelayAccessPoint, selectedRelayDevice, verificationAccessPointId]);

  let verifyButtonLabel = 'Validate RFID / NFC credential';
  if (verifying) {
    verifyButtonLabel = 'Validating credential...';
  } else if (useHardwareResolver) {
    verifyButtonLabel = 'Validate through reader device';
  }

  const relayButtonLabel = queueingRelay ? 'Queueing relay...' : 'Queue relay pulse';

  const handleVerify = async () => {
    const cleanedCredentialValue = scanState.token;

    if (!cleanedCredentialValue) {
      setError('Scan an RFID / NFC credential or paste a supported reader payload before validating.');
      return;
    }

    if (!verificationAccessPointId) {
      setError('Select an access point or a reader device mapped to an access point before validating.');
      return;
    }

    if (isRapidRepeatValue({
      previousValue: lastVerifiedCredentialRef.current.token,
      nextValue: cleanedCredentialValue,
      previousTimestamp: lastVerifiedCredentialRef.current.verifiedAt,
      cooldownMs: 2500,
    })) {
      setError(buildDuplicateValueMessage('rfid'));
      return;
    }

    const previousCredentialRef = lastVerifiedCredentialRef.current;

    lastVerifiedCredentialRef.current = {
      token: cleanedCredentialValue,
      verifiedAt: Date.now(),
    };

    setVerifying(true);
    setError('');
    setSuccessMessage('');

    try {
      const result = await resolveRfidNfcCredential({
        deviceId: useHardwareResolver ? selectedReaderDevice?.id || null : null,
        accessPointId: verificationAccessPointId,
        credentialType,
        credentialValue: cleanedCredentialValue,
        payload: {
          rawScan: scanState.rawValue,
          detectedFrom: scanState.detectedFrom,
          normalizedValue: scanState.normalizedValue || cleanedCredentialValue,
          source: useHardwareResolver ? 'staff_rfid_nfc_hardware_workflow' : 'staff_rfid_nfc_software_workflow',
        },
      });

      let message = result.decision === 'allow'
        ? 'Credential approved.'
        : 'Credential denied. Review the reason below.';
      let relayQueueErrorMessage = '';

      setRelayCommandResult(null);

      if (result.decision === 'allow' && autoQueueRelayOnAllow && selectedRelayDevice) {
        try {
          const relayResult = await queueRelayPulseForResult(result, scanState, 'staff_rfid_nfc_auto_relay');
          const relayMessage = buildRelayCompletionMessage(relayResult, selectedRelayDevice);
          if (relayMessage) {
            message = `${message} ${relayMessage}`;
          }
        } catch (relayError) {
          message = 'Credential approved, but the relay bridge queue failed.';
          relayQueueErrorMessage = normalizeAccessError(relayError, 'Credential approved, but the relay pulse could not be queued.');
        }
      }

      setVerifyResult(result);
      setSuccessMessage(message);
      setCredentialInput('');

      if (typeof onActivityRecorded === 'function') {
        await onActivityRecorded();
      }

      if (relayQueueErrorMessage) {
        setError(relayQueueErrorMessage);
      }

      if (credentialInputRef.current) {
        credentialInputRef.current.focus();
      }
    } catch (verifyError) {
      lastVerifiedCredentialRef.current = previousCredentialRef;
      setError(normalizeAccessError(verifyError, 'Failed to validate the RFID / NFC credential.'));
    } finally {
      setVerifying(false);
    }
  };

  const handleManualRelayQueue = async () => {
    if (verifyResult?.decision !== 'allow') {
      setError('Complete an allowed RFID / NFC validation before queueing a relay pulse from this console.');
      return;
    }

    if (!selectedRelayDevice) {
      setError('Choose a relay bridge device before queueing a pulse.');
      return;
    }

    setError('');
    setSuccessMessage('');

    try {
      const relayResult = await queueRelayPulseForResult(verifyResult, scanState, 'staff_rfid_nfc_manual_relay_retry');
      setSuccessMessage(buildRelayCompletionMessage(relayResult, selectedRelayDevice) || 'Relay pulse queued.');

      if (typeof onActivityRecorded === 'function') {
        await onActivityRecorded();
      }
    } catch (relayError) {
      setError(normalizeAccessError(relayError, 'Failed to queue the relay pulse.'));
    }
  };

  const handleCredentialInputKeyDown = (event) => {
    if (!autoSubmitOnEnter || event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    handleVerify();
  };

  const selectedReaderLabel = selectedReaderDevice
    ? `${selectedReaderDevice.device_name} (${selectedReaderDevice.device_key})`
    : 'Software verification only';

  const selectedRelayLabel = selectedRelayDevice
    ? `${selectedRelayDevice.device_name} (${selectedRelayDevice.device_key})`
    : 'No relay bridge device selected';

  return (
    <Card>
      <CardContent>
        <Stack spacing={2.5}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
          >
            <Box>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                RFID / NFC credential console
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Validate enrolled RFID / NFC credentials from a dedicated reader, pasted UID, or reader JSON payload. When a relay target is configured, approved entries can queue a Raspberry Pi bridge pulse.
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatAccessRefreshLabel(lastLoadedAt, 'Waiting for the first RFID / NFC console sync.')}
              </Typography>
            </Box>
            <Button variant="outlined" size="small" onClick={loadCardData} disabled={loading || verifying || queueingRelay}>
              Refresh devices
            </Button>
          </Stack>

          {error ? <Alert severity="error">{error}</Alert> : null}
          {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={`${readerDevices.length} reader${readerDevices.length === 1 ? '' : 's'}`} color="primary" size="small" />
            <Chip label={`${relayDevices.length} relay target${relayDevices.length === 1 ? '' : 's'}`} color="secondary" size="small" />
            {selectedReaderDevice ? (
              <Chip
                label={(selectedReaderDevice.heartbeat_status || 'offline').toUpperCase()}
                color={getHeartbeatChipColor(selectedReaderDevice.heartbeat_status)}
                size="small"
                variant="outlined"
              />
            ) : null}
          </Stack>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
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
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Reader device"
                value={readerDeviceId}
                onChange={(event) => {
                  const nextReaderDeviceId = event.target.value;
                  const nextReaderDevice = readerDevices.find((device) => device.id === nextReaderDeviceId) || null;
                  setReaderDeviceId(nextReaderDeviceId);
                  if (nextReaderDevice?.access_point_id && !accessPointId) {
                    setAccessPointId(nextReaderDevice.access_point_id);
                  }
                  const configuredType = normalizeCredentialType(
                    nextReaderDevice?.config?.credentialType || nextReaderDevice?.config?.credential_type,
                  );
                  if (configuredType) {
                    setCredentialType(configuredType);
                  }
                }}
                disabled={loading || !readerDevices.length}
              >
                <MenuItem value="">Software verification only</MenuItem>
                {readerDevices.map((device) => (
                  <MenuItem key={device.id} value={device.id}>
                    {device.device_name} · {device.branch_name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
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
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                select
                label="Credential type"
                value={credentialType}
                onChange={(event) => setCredentialType(event.target.value)}
              >
                {credentialTypeOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
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
                  disabled={!readerDevices.length}
                />
              )}
              label="Use hardware resolver when a reader is selected"
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
            inputRef={credentialInputRef}
            label="Scanned RFID / NFC payload"
            placeholder='Paste a raw UID or reader payload like {"uid":"04AABBCC"}'
            value={credentialInput}
            onChange={(event) => setCredentialInput(event.target.value)}
            onKeyDown={handleCredentialInputKeyDown}
            multiline
            minRows={3}
            fullWidth
          />

          <Alert severity="info">
            {scanPreviewMessage}
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
                setCredentialInput('');
                setVerifyResult(null);
                setRelayCommandResult(null);
                if (credentialInputRef.current) {
                  credentialInputRef.current.focus();
                }
              }}
              disabled={verifying && !credentialInput}
            >
              Clear credential buffer
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

          <Divider />

          <Stack spacing={1}>
            <Typography variant="body2">
              Selected reader: {selectedReaderLabel}
            </Typography>
            <Typography variant="body2">
              Selected relay: {selectedRelayLabel}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Credential type: {getCredentialTypeLabel(credentialType)}
              {scanState.token ? ` • Parsed UID: ${formatCredentialValueMask(scanState.token)}` : ''}
            </Typography>
            {selectedReaderDevice ? (
              <>
                <Typography variant="body2" color="text.secondary">
                  Reader credentials: {formatCredentialTypes(selectedReaderDevice.credential_types)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Last heartbeat: {formatDateTime(selectedReaderDevice.last_seen_at)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Mode: {selectedReaderDevice.integration_mode || 'bridge'}
                </Typography>
              </>
            ) : (
              <Alert severity="info">
                No reader device selected. The console will validate credentials directly through the software flow.
              </Alert>
            )}
            {selectedRelayDevice ? (
              <Typography variant="body2" color="text.secondary">
                Relay pulse: {normalizeRelayPulseMs(relayPulseMs, getRelayDefaultPulseMs(selectedRelayDevice))} ms
              </Typography>
            ) : null}
          </Stack>

          {!readerDevices.length ? (
            <Alert severity="info">
              No RFID / NFC-ready devices are registered yet. Register a reader in the admin hardware page to route scans through the hardware layer.
            </Alert>
          ) : null}
          {!relayDevices.length ? (
            <Alert severity="info">
              No relay targets are registered yet. Approved RFID / NFC scans will not queue a Raspberry Pi relay pulse until a bridge-mode relay device exists.
            </Alert>
          ) : null}
          {loading ? <Alert severity="info">Refreshing RFID / NFC console data...</Alert> : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
