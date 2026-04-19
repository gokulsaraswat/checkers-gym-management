import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import { Link as RouterLink } from 'react-router-dom';

import { PATHS } from '../../app/paths';
import { listAccessPoints } from './accessClient';
import {
  getAccessHardwareSnapshot,
  isRelayBridgeDevice,
  isRfidNfcReaderDevice,
  isVendorControllerDevice,
  listAccessHardwareDevices,
  listRecentAccessHardwareEvents,
  listRecentRelayBridgeCommands,
  logAccessHardwareHeartbeat,
  queueRelayBridgeCommand,
  saveAccessHardwareDevice,
} from './accessHardwareClient';
import {
  buildRelayBridgePreview,
  buildRelayCompletionMessage,
  getRelayDefaultPulseMs,
  normalizeRelayPulseMs,
} from './piRelayBridgeHelpers';
import RfidCredentialRegistryCard from './RfidCredentialRegistryCard';
import VendorControllerCommandCard from './VendorControllerCommandCard';

const deviceTypeOptions = [
  { value: 'scanner', label: 'Scanner' },
  { value: 'relay', label: 'Relay' },
  { value: 'controller', label: 'Controller' },
  { value: 'reader', label: 'RFID / NFC reader' },
  { value: 'tablet', label: 'Tablet / kiosk' },
  { value: 'bridge', label: 'Bridge / middleware' },
];

const integrationModeOptions = [
  { value: 'manual', label: 'Manual / local setup' },
  { value: 'bridge', label: 'Bridge service' },
  { value: 'webhook', label: 'Webhook callback' },
  { value: 'polling', label: 'Polling connector' },
  { value: 'sdk', label: 'Vendor SDK / API' },
];

const relayBehaviorOptions = [
  { value: 'none', label: 'No relay output' },
  { value: 'door_strike', label: 'Door strike' },
  { value: 'turnstile', label: 'Turnstile' },
  { value: 'maglock', label: 'Maglock' },
  { value: 'aux', label: 'Aux relay' },
];

const heartbeatStatusOptions = [
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
  { value: 'warning', label: 'Warning' },
  { value: 'maintenance', label: 'Maintenance' },
];

const emptyDeviceForm = {
  id: '',
  branch_name: 'Main Branch',
  access_point_id: '',
  device_name: '',
  device_type: 'scanner',
  integration_mode: 'bridge',
  credential_types: 'qr, access_token',
  relay_behavior: 'none',
  heartbeat_status: 'offline',
  notes: '',
  config_json: '{}',
  is_active: true,
};

const emptyHeartbeatForm = {
  device_id: '',
  status: 'online',
  payload_json: '{\n  "source": "admin-test"\n}',
};

const emptyRelayForm = {
  device_id: '',
  pulse_ms: '2500',
  reason: 'Front desk release test pulse',
  dry_run: true,
};

const heartbeatChipColorMap = {
  online: 'success',
  offline: 'default',
  warning: 'warning',
  maintenance: 'secondary',
  error: 'error',
};

const eventChipColorMap = {
  heartbeat: 'info',
  decision: 'primary',
  error: 'error',
  configuration: 'secondary',
  test: 'warning',
  command: 'primary',
};

const relayCommandStatusChipColorMap = {
  queued: 'warning',
  dispatched: 'info',
  completed: 'success',
  failed: 'error',
  cancelled: 'default',
};

function SnapshotCard({ label, value, helper }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h4" fontWeight={800}>
          {value ?? 0}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {helper}
        </Typography>
      </CardContent>
    </Card>
  );
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

function normalizeCredentialTypes(value) {
  const parts = String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (!parts.length) {
    return ['access_token'];
  }

  return Array.from(new Set(parts));
}

function parseJsonInput(value, label) {
  const trimmedValue = String(value || '').trim();

  if (!trimmedValue) {
    return {};
  }

  try {
    return JSON.parse(trimmedValue);
  } catch (error) {
    throw new Error(`${label} must be valid JSON.`);
  }
}

function stringifyJson(value) {
  try {
    return JSON.stringify(value || {}, null, 2);
  } catch (error) {
    return '{}';
  }
}

function buildDeviceForm(device) {
  return {
    id: device.id || '',
    branch_name: device.branch_name || 'Main Branch',
    access_point_id: device.access_point_id || device.access_point?.id || '',
    device_name: device.device_name || '',
    device_type: device.device_type || 'scanner',
    integration_mode: device.integration_mode || 'bridge',
    credential_types: Array.isArray(device.credential_types)
      ? device.credential_types.join(', ')
      : 'access_token',
    relay_behavior: device.relay_behavior || 'none',
    heartbeat_status: device.heartbeat_status || 'offline',
    notes: device.notes || '',
    config_json: stringifyJson(device.config),
    is_active: Boolean(device.is_active),
  };
}

function formatCredentialTypes(value) {
  if (!Array.isArray(value) || !value.length) {
    return '—';
  }

  return value.join(', ');
}

function formatPayloadPreview(value) {
  const json = stringifyJson(value);

  if (json.length <= 180) {
    return json;
  }

  return `${json.slice(0, 177)}...`;
}

function formatRelayReason(value) {
  return value || 'No reason provided';
}

export default function AdminAccessHardwarePage() {
  const [loading, setLoading] = useState(true);
  const [savingDevice, setSavingDevice] = useState(false);
  const [sendingHeartbeat, setSendingHeartbeat] = useState(false);
  const [queueingRelay, setQueueingRelay] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [snapshot, setSnapshot] = useState({});
  const [accessPoints, setAccessPoints] = useState([]);
  const [devices, setDevices] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [relayCommands, setRelayCommands] = useState([]);
  const [deviceForm, setDeviceForm] = useState(emptyDeviceForm);
  const [heartbeatForm, setHeartbeatForm] = useState(emptyHeartbeatForm);
  const [relayForm, setRelayForm] = useState(emptyRelayForm);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [snapshotData, points, deviceRows, eventRows, relayRows] = await Promise.all([
        getAccessHardwareSnapshot(7),
        listAccessPoints(),
        listAccessHardwareDevices(),
        listRecentAccessHardwareEvents(20),
        listRecentRelayBridgeCommands(12),
      ]);

      setSnapshot(snapshotData || {});
      setAccessPoints(points || []);
      setDevices(deviceRows || []);
      setRecentEvents(eventRows || []);
      setRelayCommands(relayRows || []);
    } catch (fetchError) {
      setError(fetchError.message || 'Failed to load access hardware data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  useEffect(() => {
    setHeartbeatForm((current) => {
      const hasSelectedDevice = devices.some((device) => device.id === current.device_id);

      if (hasSelectedDevice || !devices.length) {
        return current;
      }

      return {
        ...current,
        device_id: devices[0].id,
      };
    });
  }, [devices]);

  const accessPointOptions = useMemo(
    () => accessPoints.filter((point) => point.is_active),
    [accessPoints],
  );

  const relayDevices = useMemo(
    () => devices.filter((device) => isRelayBridgeDevice(device)),
    [devices],
  );

  const vendorControllerDevices = useMemo(
    () => devices.filter((device) => isVendorControllerDevice(device)),
    [devices],
  );

  useEffect(() => {
    setRelayForm((current) => {
      const hasSelectedRelay = relayDevices.some((device) => device.id === current.device_id);

      if (hasSelectedRelay || !relayDevices.length) {
        return current;
      }

      const firstRelayDevice = relayDevices[0];

      return {
        ...current,
        device_id: firstRelayDevice.id,
        pulse_ms: String(getRelayDefaultPulseMs(firstRelayDevice)),
      };
    });
  }, [relayDevices]);

  const selectedHeartbeatDevice = useMemo(
    () => devices.find((device) => device.id === heartbeatForm.device_id) || null,
    [devices, heartbeatForm.device_id],
  );

  const selectedRelayDevice = useMemo(
    () => relayDevices.find((device) => device.id === relayForm.device_id) || null,
    [relayDevices, relayForm.device_id],
  );

  const selectedRelayAccessPoint = useMemo(() => {
    if (!selectedRelayDevice) {
      return null;
    }

    return accessPointOptions.find((point) => point.id === selectedRelayDevice.access_point_id) || null;
  }, [accessPointOptions, selectedRelayDevice]);

  const relayPreviewMessage = useMemo(() => buildRelayBridgePreview({
    relayDevice: selectedRelayDevice,
    accessPoint: selectedRelayAccessPoint,
    pulseMs: relayForm.pulse_ms,
    reason: relayForm.reason,
    dryRun: relayForm.dry_run,
  }), [relayForm.dry_run, relayForm.pulse_ms, relayForm.reason, selectedRelayAccessPoint, selectedRelayDevice]);

  let deviceSubmitLabel = 'Register device';
  if (savingDevice) {
    deviceSubmitLabel = 'Saving device...';
  } else if (deviceForm.id) {
    deviceSubmitLabel = 'Update device';
  }

  const heartbeatSubmitLabel = sendingHeartbeat ? 'Sending heartbeat...' : 'Send heartbeat';
  const relaySubmitLabel = queueingRelay ? 'Queueing relay pulse...' : 'Queue test pulse';

  const handleDeviceFieldChange = (field) => (event) => {
    const { checked, value } = event.target;
    const nextValue = field === 'is_active' ? checked : value;

    setDeviceForm((current) => {
      const nextState = {
        ...current,
        [field]: nextValue,
      };

      if (field === 'access_point_id') {
        const matchedPoint = accessPointOptions.find((point) => point.id === value);
        if (matchedPoint) {
          nextState.branch_name = matchedPoint.branch_name || current.branch_name;
        }
      }

      return nextState;
    });
  };

  const handleHeartbeatFieldChange = (field) => (event) => {
    const { value } = event.target;

    setHeartbeatForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleRelayFieldChange = (field) => (event) => {
    const nextValue = field === 'dry_run' ? event.target.checked : event.target.value;

    setRelayForm((current) => {
      const nextState = {
        ...current,
        [field]: nextValue,
      };

      if (field === 'device_id') {
        const matchedRelayDevice = relayDevices.find((device) => device.id === nextValue);
        if (matchedRelayDevice) {
          nextState.pulse_ms = String(getRelayDefaultPulseMs(matchedRelayDevice));
        }
      }

      return nextState;
    });
  };

  const handleSaveDevice = async () => {
    setSavingDevice(true);
    setError('');
    setSuccessMessage('');

    try {
      const config = parseJsonInput(deviceForm.config_json, 'Device config');
      const credentialTypes = normalizeCredentialTypes(deviceForm.credential_types);

      await saveAccessHardwareDevice({
        id: deviceForm.id || null,
        branch_name: deviceForm.branch_name || 'Main Branch',
        access_point_id: deviceForm.access_point_id || null,
        device_name: deviceForm.device_name.trim(),
        device_type: deviceForm.device_type,
        integration_mode: deviceForm.integration_mode,
        credential_types: credentialTypes,
        relay_behavior: deviceForm.relay_behavior,
        heartbeat_status: deviceForm.heartbeat_status,
        notes: deviceForm.notes.trim(),
        config,
        is_active: deviceForm.is_active,
      });

      setDeviceForm(emptyDeviceForm);
      setSuccessMessage('Access hardware device saved.');
      await loadPage();
    } catch (saveError) {
      setError(saveError.message || 'Failed to save the access hardware device.');
    } finally {
      setSavingDevice(false);
    }
  };

  const handleSendHeartbeat = async () => {
    if (!selectedHeartbeatDevice?.device_key) {
      setError('Choose a registered device first.');
      return;
    }

    setSendingHeartbeat(true);
    setError('');
    setSuccessMessage('');

    try {
      const payload = parseJsonInput(heartbeatForm.payload_json, 'Heartbeat payload');
      await logAccessHardwareHeartbeat({
        deviceKey: selectedHeartbeatDevice.device_key,
        status: heartbeatForm.status,
        payload,
      });
      setSuccessMessage('Heartbeat recorded for the selected device.');
      await loadPage();
    } catch (heartbeatError) {
      setError(heartbeatError.message || 'Failed to send the test heartbeat.');
    } finally {
      setSendingHeartbeat(false);
    }
  };

  const handleQueueRelayCommand = async () => {
    if (!selectedRelayDevice) {
      setError('Choose a relay bridge device first.');
      return;
    }

    setQueueingRelay(true);
    setError('');
    setSuccessMessage('');

    try {
      const result = await queueRelayBridgeCommand({
        deviceId: selectedRelayDevice.id,
        accessPointId: selectedRelayDevice.access_point_id || null,
        commandType: 'pulse',
        pulseMs: normalizeRelayPulseMs(relayForm.pulse_ms, getRelayDefaultPulseMs(selectedRelayDevice)),
        reason: relayForm.reason.trim() || 'Admin relay bridge test pulse',
        payload: {
          source: 'admin_access_hardware_page',
          dryRun: relayForm.dry_run,
          deviceType: selectedRelayDevice.device_type,
          relayBehavior: selectedRelayDevice.relay_behavior,
        },
        dryRun: relayForm.dry_run,
      });

      setSuccessMessage(buildRelayCompletionMessage(result, selectedRelayDevice) || 'Relay command queued.');
      await loadPage();
    } catch (relayError) {
      setError(relayError.message || 'Failed to queue the relay bridge command.');
    } finally {
      setQueueingRelay(false);
    }
  };

  const handleEditDevice = (device) => {
    setDeviceForm(buildDeviceForm(device));
  };

  const resetDeviceForm = () => {
    setDeviceForm(emptyDeviceForm);
  };

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
            Access hardware layer
          </Typography>
          <Typography color="text.secondary">
            Register generic scanners, kiosks, and controller devices, then queue Raspberry Pi relay commands or vendor-controller connector actions through the shared hardware layer. QR scanner workflow support remains available from the live staff console.
          </Typography>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button
            component={RouterLink}
            to={PATHS.staffAccess}
            variant="contained"
          >
            Open scanner console
          </Button>
          <Button
            component={RouterLink}
            to={PATHS.adminAccess}
            startIcon={<ArrowBackRoundedIcon />}
            variant="outlined"
          >
            Back to access control
          </Button>
        </Stack>
      </Stack>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {successMessage ? <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert> : null}

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} lg={4}>
          <SnapshotCard label="Registered devices" value={snapshot.deviceCount} helper="All configured hardware records" />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <SnapshotCard label="Online devices" value={snapshot.onlineDeviceCount} helper="Heartbeat seen in the last 10 minutes" />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <SnapshotCard label="Linked access points" value={snapshot.linkedAccessPointCount} helper="Devices mapped to gates or desks" />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <SnapshotCard label="Relay-ready devices" value={snapshot.relayReadyDeviceCount ?? relayDevices.length} helper="Bridge-mode relay targets" />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <SnapshotCard label="Queued relay commands" value={snapshot.queuedRelayCommandCount} helper="Pending Raspberry Pi queue" />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <SnapshotCard label="Vendor-ready devices" value={snapshot.vendorReadyDeviceCount ?? vendorControllerDevices.length} helper="Controllers using SDK, polling, or webhook connectors" />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <SnapshotCard label="Queued vendor commands" value={snapshot.queuedVendorCommandCount ?? 0} helper="Pending vendor API actions" />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <SnapshotCard label="Recent hardware errors" value={snapshot.recentErrorCount} helper="Events marked error in the last 7 days" />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} xl={7}>
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Stack spacing={2.5}>
                  <Box>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                      Connected device registry
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      The registry stays device-agnostic. In this patch, reader devices can back RFID / NFC credentials, relay-capable bridge devices remain eligible for the Raspberry Pi queue, and controller devices can expose vendor API connectors.
                    </Typography>
                  </Box>

                  {!devices.length ? (
                    <Alert severity="info">No access hardware devices are registered yet.</Alert>
                  ) : (
                    <Stack spacing={1.5}>
                      {devices.map((device) => (
                        <Box key={device.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                          <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1.5}
                            justifyContent="space-between"
                            alignItems={{ xs: 'flex-start', sm: 'center' }}
                          >
                            <Stack spacing={0.5}>
                              <Typography fontWeight={700}>
                                {device.device_name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Key: {device.device_key} • {device.device_type} • {device.integration_mode}
                              </Typography>
                            </Stack>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                              {isRelayBridgeDevice(device) ? (
                                <Chip label="PI BRIDGE READY" color="primary" size="small" />
                              ) : null}
                              {isRfidNfcReaderDevice(device) ? (
                                <Chip label="RFID / NFC READY" color="secondary" size="small" />
                              ) : null}
                              {isVendorControllerDevice(device) ? (
                                <Chip label="VENDOR API READY" color="info" size="small" />
                              ) : null}
                              <Chip
                                label={(device.heartbeat_status || 'offline').toUpperCase()}
                                color={heartbeatChipColorMap[device.heartbeat_status] || 'default'}
                                size="small"
                              />
                              <Chip
                                label={device.is_active ? 'ACTIVE' : 'INACTIVE'}
                                color={device.is_active ? 'success' : 'default'}
                                size="small"
                                variant={device.is_active ? 'filled' : 'outlined'}
                              />
                            </Stack>
                          </Stack>
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            Point: {device.access_point?.name || 'Unassigned'}
                            {device.branch_name ? ` • ${device.branch_name}` : ''}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                            Credentials: {formatCredentialTypes(device.credential_types)} • Relay: {device.relay_behavior || 'none'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                            Last seen: {formatDateTime(device.last_seen_at)}
                          </Typography>
                          {device.notes ? (
                            <Typography variant="body2" sx={{ mt: 0.75 }}>
                              Notes: {device.notes}
                            </Typography>
                          ) : null}
                          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                            <Button size="small" variant="outlined" onClick={() => handleEditDevice(device)}>
                              Edit
                            </Button>
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  )}

                  <Divider />

                  <Box>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                      {deviceForm.id ? 'Update hardware device' : 'Register hardware device'}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Device name"
                          value={deviceForm.device_name}
                          onChange={handleDeviceFieldChange('device_name')}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Branch name"
                          value={deviceForm.branch_name}
                          onChange={handleDeviceFieldChange('branch_name')}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          select
                          label="Access point"
                          value={deviceForm.access_point_id}
                          onChange={handleDeviceFieldChange('access_point_id')}
                        >
                          <MenuItem value="">Unassigned</MenuItem>
                          {accessPointOptions.map((point) => (
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
                          label="Device type"
                          value={deviceForm.device_type}
                          onChange={handleDeviceFieldChange('device_type')}
                        >
                          {deviceTypeOptions.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          select
                          label="Integration mode"
                          value={deviceForm.integration_mode}
                          onChange={handleDeviceFieldChange('integration_mode')}
                        >
                          {integrationModeOptions.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          select
                          label="Relay behaviour"
                          value={deviceForm.relay_behavior}
                          onChange={handleDeviceFieldChange('relay_behavior')}
                        >
                          {relayBehaviorOptions.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          select
                          label="Heartbeat status"
                          value={deviceForm.heartbeat_status}
                          onChange={handleDeviceFieldChange('heartbeat_status')}
                        >
                          {heartbeatStatusOptions.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Credential types"
                          value={deviceForm.credential_types}
                          onChange={handleDeviceFieldChange('credential_types')}
                          helperText="Comma-separated values, for example qr, access_token, rfid_uid, nfc_uid"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Notes"
                          value={deviceForm.notes}
                          onChange={handleDeviceFieldChange('notes')}
                          multiline
                          minRows={2}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Config JSON"
                          value={deviceForm.config_json}
                          onChange={handleDeviceFieldChange('config_json')}
                          multiline
                          minRows={4}
                          helperText="For Raspberry Pi relay devices, store bridgeProvider, relayChannel, and defaultPulseMs here. For vendor controllers, store vendorProvider, controllerId, doorId, and apiBaseUrl here."
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <FormControlLabel
                          control={(
                            <Switch
                              checked={Boolean(deviceForm.is_active)}
                              onChange={handleDeviceFieldChange('is_active')}
                            />
                          )}
                          label="Device active"
                        />
                      </Grid>
                    </Grid>
                  </Box>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <Button
                      variant="contained"
                      onClick={handleSaveDevice}
                      disabled={savingDevice || !deviceForm.device_name.trim()}
                    >
                      {deviceSubmitLabel}
                    </Button>
                    <Button variant="outlined" onClick={resetDeviceForm} disabled={savingDevice}>
                      Clear form
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
            <RfidCredentialRegistryCard
              accessPoints={accessPointOptions}
              devices={devices}
              onCredentialSaved={loadPage}
            />
          </Stack>
        </Grid>
        <Grid item xs={12} xl={5}>
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                      Raspberry Pi bridge queue
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Queue a dry-run or live relay pulse that a Raspberry Pi bridge can claim, execute, and acknowledge against the selected device key.
                    </Typography>
                  </Box>
                  {!relayDevices.length ? (
                    <Alert severity="info">
                      No bridge-mode relay devices are registered yet. Save a relay or controller device with integration mode set to bridge and relay behaviour set to a non-none value.
                    </Alert>
                  ) : (
                    <>
                      <TextField
                        fullWidth
                        select
                        label="Relay bridge device"
                        value={relayForm.device_id}
                        onChange={handleRelayFieldChange('device_id')}
                      >
                        {relayDevices.map((device) => (
                          <MenuItem key={device.id} value={device.id}>
                            {device.device_name} · {device.branch_name}
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        fullWidth
                        type="number"
                        label="Pulse duration (ms)"
                        value={relayForm.pulse_ms}
                        onChange={handleRelayFieldChange('pulse_ms')}
                        inputProps={{ min: 300, max: 15000, step: 100 }}
                      />
                      <TextField
                        fullWidth
                        label="Reason / audit note"
                        value={relayForm.reason}
                        onChange={handleRelayFieldChange('reason')}
                      />
                      <FormControlLabel
                        control={(
                          <Switch
                            checked={Boolean(relayForm.dry_run)}
                            onChange={handleRelayFieldChange('dry_run')}
                          />
                        )}
                        label="Dry run only"
                      />
                      <Alert severity="info">
                        {relayPreviewMessage}
                      </Alert>
                      <Button
                        variant="contained"
                        onClick={handleQueueRelayCommand}
                        disabled={queueingRelay || !selectedRelayDevice}
                      >
                        {relaySubmitLabel}
                      </Button>
                    </>
                  )}

                  <Divider />

                  <Box>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                      Recent relay commands
                    </Typography>
                    {!relayCommands.length ? (
                      <Alert severity="info">Queued relay bridge commands will appear here after the first pulse request.</Alert>
                    ) : (
                      <Stack spacing={1.5}>
                        {relayCommands.map((command) => (
                          <Box key={command.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }}>
                              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Chip label={(command.command_status || 'queued').toUpperCase()} color={relayCommandStatusChipColorMap[command.command_status] || 'default'} size="small" />
                                <Chip label={(command.command_type || 'pulse').toUpperCase()} variant="outlined" size="small" />
                              </Stack>
                              <Typography variant="caption" color="text.secondary">
                                {formatDateTime(command.created_at)}
                              </Typography>
                            </Stack>
                            <Typography variant="subtitle2" fontWeight={700} mt={1}>
                              {command.device_name || 'Relay device'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {command.device_key ? `${command.device_key} • ` : ''}
                              {command.branch_name || 'Main Branch'}
                              {command.access_point_name ? ` • ${command.access_point_name}` : ''}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.75 }}>
                              Pulse: {command.pulse_ms || 2500} ms • Channel: {command.relay_channel || 1}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                              Reason: {formatRelayReason(command.requested_reason)}
                            </Typography>
                            {command.command_payload ? (
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, wordBreak: 'break-word' }}>
                                Payload: {formatPayloadPreview(command.command_payload)}
                              </Typography>
                            ) : null}
                            {(command.dispatched_at || command.completed_at) ? (
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                                {command.dispatched_at ? `Dispatched: ${formatDateTime(command.dispatched_at)}` : 'Not dispatched yet'}
                                {command.completed_at ? ` • Completed: ${formatDateTime(command.completed_at)}` : ''}
                              </Typography>
                            ) : null}
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            <VendorControllerCommandCard
              accessPoints={accessPointOptions}
              devices={devices}
              onCommandQueued={loadPage}
            />

            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                      Heartbeat and bridge test
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Use this admin-only test action to confirm that the generic hardware layer can still update device health while relay, RFID, and vendor-controller workflows are connected.
                    </Typography>
                  </Box>
                  <TextField
                    fullWidth
                    select
                    label="Device"
                    value={heartbeatForm.device_id}
                    onChange={handleHeartbeatFieldChange('device_id')}
                    disabled={!devices.length}
                  >
                    {!devices.length ? <MenuItem value="">No registered devices</MenuItem> : null}
                    {devices.map((device) => (
                      <MenuItem key={device.id} value={device.id}>
                        {device.device_name} · {device.device_key}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    fullWidth
                    select
                    label="Status"
                    value={heartbeatForm.status}
                    onChange={handleHeartbeatFieldChange('status')}
                  >
                    {heartbeatStatusOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    fullWidth
                    label="Heartbeat payload JSON"
                    value={heartbeatForm.payload_json}
                    onChange={handleHeartbeatFieldChange('payload_json')}
                    multiline
                    minRows={4}
                    helperText={selectedHeartbeatDevice ? `Selected key: ${selectedHeartbeatDevice.device_key}` : 'Select a device to send a heartbeat.'}
                  />
                  <Button
                    variant="contained"
                    startIcon={<SyncRoundedIcon />}
                    onClick={handleSendHeartbeat}
                    disabled={sendingHeartbeat || !devices.length}
                  >
                    {heartbeatSubmitLabel}
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Recent hardware events
                </Typography>
                {!recentEvents.length ? (
                  <Alert severity="info">Hardware heartbeats, relay commands, vendor-controller actions, and decision events will appear here.</Alert>
                ) : (
                  <Stack spacing={2}>
                    {recentEvents.map((event, index) => (
                      <Box key={event.id || `${event.created_at}-${index}`}>
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={1}
                          justifyContent="space-between"
                          alignItems={{ xs: 'flex-start', sm: 'center' }}
                        >
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Chip
                              label={(event.event_type || 'event').toUpperCase()}
                              color={eventChipColorMap[event.event_type] || 'default'}
                              size="small"
                            />
                            <Chip
                              label={(event.status || 'received').toUpperCase()}
                              color={heartbeatChipColorMap[event.status] || relayCommandStatusChipColorMap[event.status] || 'default'}
                              size="small"
                              variant="outlined"
                            />
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            {formatDateTime(event.created_at)}
                          </Typography>
                        </Stack>
                        <Typography variant="subtitle2" fontWeight={700} mt={1}>
                          {event.device_name || 'Unknown device'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {event.device_type || 'Unknown type'}
                          {event.device_key ? ` • ${event.device_key}` : ''}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.75 }}>
                          {event.access_point_name ? `Point: ${event.access_point_name}` : 'No access point linked'}
                          {event.branch_name ? ` • ${event.branch_name}` : ''}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, wordBreak: 'break-word' }}>
                          Payload: {formatPayloadPreview(event.event_payload)}
                        </Typography>
                        {index < recentEvents.length - 1 ? <Divider sx={{ mt: 2 }} /> : null}
                      </Box>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {loading ? <Alert severity="info" sx={{ mt: 3 }}>Refreshing access hardware data...</Alert> : null}
    </Box>
  );
}
