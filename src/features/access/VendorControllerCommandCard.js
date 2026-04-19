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
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';

import {
  isVendorControllerDevice,
  listRecentVendorControllerCommands,
  queueVendorControllerCommand,
} from './accessHardwareClient';
import {
  formatAccessRefreshLabel,
  normalizeAccessError,
  readBooleanAccessPreference,
  readTextAccessPreference,
  writeAccessPreference,
} from './accessStabilizationHelpers';
import {
  buildVendorControllerCompletionMessage,
  buildVendorControllerPayload,
  buildVendorControllerPreview,
  getVendorCommandTypeLabel,
  getVendorControllerControllerIdentifier,
  getVendorControllerDoorIdentifier,
  getVendorControllerProviderLabel,
  normalizeVendorCommandType,
} from './vendorControllerHelpers';

const vendorCommandOptions = [
  { value: 'unlock', label: 'Unlock' },
  { value: 'lock', label: 'Lock' },
  { value: 'sync', label: 'Sync' },
  { value: 'grant_access', label: 'Grant access' },
  { value: 'refresh_device', label: 'Refresh device' },
];

const commandStatusChipColorMap = {
  queued: 'warning',
  dispatched: 'info',
  completed: 'success',
  failed: 'error',
  cancelled: 'default',
};

const emptyVendorForm = {
  device_id: '',
  access_point_id: '',
  command_type: 'unlock',
  controller_identifier: '',
  door_identifier: '',
  reason: 'Front desk vendor-controller test command',
  payload_json: '{\n  "source": "admin-vendor-controller"\n}',
  dry_run: true,
};

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

function stringifyJson(value) {
  try {
    return JSON.stringify(value || {}, null, 2);
  } catch (error) {
    return '{}';
  }
}

function formatPayloadPreview(value) {
  const json = stringifyJson(value);

  if (json.length <= 180) {
    return json;
  }

  return `${json.slice(0, 177)}...`;
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

export default function VendorControllerCommandCard({
  accessPoints = [],
  devices = [],
  onCommandQueued = null,
}) {
  const [loading, setLoading] = useState(true);
  const [queueing, setQueueing] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [commands, setCommands] = useState([]);
  const [vendorForm, setVendorForm] = useState(() => ({
    ...emptyVendorForm,
    device_id: readTextAccessPreference('vendor-command:deviceId', ''),
    access_point_id: readTextAccessPreference('vendor-command:accessPointId', ''),
    command_type: readTextAccessPreference('vendor-command:commandType', 'unlock') || 'unlock',
    controller_identifier: readTextAccessPreference('vendor-command:controllerIdentifier', ''),
    door_identifier: readTextAccessPreference('vendor-command:doorIdentifier', ''),
    reason: readTextAccessPreference('vendor-command:reason', emptyVendorForm.reason),
    payload_json: readTextAccessPreference('vendor-command:payloadJson', emptyVendorForm.payload_json),
    dry_run: readBooleanAccessPreference('vendor-command:dryRun', true),
  }));

  const vendorDevices = useMemo(
    () => (devices || []).filter((device) => isVendorControllerDevice(device)),
    [devices],
  );

  const accessPointOptions = useMemo(
    () => (accessPoints || []).filter((point) => point.is_active),
    [accessPoints],
  );

  const loadCommands = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const rows = await listRecentVendorControllerCommands(12);
      setCommands(rows || []);
      setLastLoadedAt(new Date().toISOString());
    } catch (fetchError) {
      setError(normalizeAccessError(fetchError, 'Failed to load recent vendor controller commands.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCommands();
  }, [loadCommands]);

  useEffect(() => {
    writeAccessPreference('vendor-command:deviceId', vendorForm.device_id || '');
    writeAccessPreference('vendor-command:accessPointId', vendorForm.access_point_id || '');
    writeAccessPreference('vendor-command:commandType', vendorForm.command_type || 'unlock');
    writeAccessPreference('vendor-command:controllerIdentifier', vendorForm.controller_identifier || '');
    writeAccessPreference('vendor-command:doorIdentifier', vendorForm.door_identifier || '');
    writeAccessPreference('vendor-command:reason', vendorForm.reason || emptyVendorForm.reason);
    writeAccessPreference('vendor-command:payloadJson', vendorForm.payload_json || emptyVendorForm.payload_json);
    writeAccessPreference('vendor-command:dryRun', Boolean(vendorForm.dry_run));
  }, [vendorForm]);

  useEffect(() => {
    setVendorForm((current) => {
      const hasSelectedDevice = vendorDevices.some((device) => device.id === current.device_id);

      if (hasSelectedDevice || !vendorDevices.length) {
        return current;
      }

      const firstDevice = vendorDevices[0];

      return {
        ...current,
        device_id: firstDevice.id,
        access_point_id: firstDevice.access_point_id || current.access_point_id,
        controller_identifier: current.controller_identifier || getVendorControllerControllerIdentifier(firstDevice),
        door_identifier: current.door_identifier || getVendorControllerDoorIdentifier(firstDevice),
      };
    });
  }, [vendorDevices]);

  const selectedDevice = useMemo(
    () => vendorDevices.find((device) => device.id === vendorForm.device_id) || null,
    [vendorDevices, vendorForm.device_id],
  );

  const selectedAccessPoint = useMemo(() => {
    const requestedPointId = vendorForm.access_point_id || selectedDevice?.access_point_id || '';

    if (!requestedPointId) {
      return null;
    }

    return accessPointOptions.find((point) => point.id === requestedPointId) || null;
  }, [accessPointOptions, selectedDevice, vendorForm.access_point_id]);

  const vendorPreviewMessage = useMemo(() => buildVendorControllerPreview({
    device: selectedDevice,
    accessPoint: selectedAccessPoint,
    commandType: vendorForm.command_type,
    reason: vendorForm.reason,
    dryRun: vendorForm.dry_run,
    controllerIdentifier: vendorForm.controller_identifier,
    doorIdentifier: vendorForm.door_identifier,
  }), [
    selectedAccessPoint,
    selectedDevice,
    vendorForm.command_type,
    vendorForm.controller_identifier,
    vendorForm.door_identifier,
    vendorForm.dry_run,
    vendorForm.reason,
  ]);

  const queueLabel = queueing ? 'Queueing command...' : 'Queue vendor command';

  const handleFieldChange = (field) => (event) => {
    const nextValue = field === 'dry_run' ? event.target.checked : event.target.value;

    setVendorForm((current) => {
      const nextState = {
        ...current,
        [field]: nextValue,
      };

      if (field === 'device_id') {
        const matchedDevice = vendorDevices.find((device) => device.id === nextValue);

        if (matchedDevice) {
          nextState.access_point_id = matchedDevice.access_point_id || current.access_point_id;
          nextState.controller_identifier = getVendorControllerControllerIdentifier(matchedDevice);
          nextState.door_identifier = getVendorControllerDoorIdentifier(matchedDevice);
        }
      }

      return nextState;
    });
  };

  const handleQueueCommand = async () => {
    if (!selectedDevice) {
      setError('Select a vendor-ready controller first.');
      return;
    }

    const normalizedCommandType = normalizeVendorCommandType(vendorForm.command_type);
    const resolvedControllerIdentifier = vendorForm.controller_identifier.trim() || getVendorControllerControllerIdentifier(selectedDevice);
    const resolvedDoorIdentifier = vendorForm.door_identifier.trim() || getVendorControllerDoorIdentifier(selectedDevice, selectedAccessPoint);

    if (!resolvedControllerIdentifier) {
      setError('A controller identifier is required before queuing a vendor controller command.');
      return;
    }

    if (['unlock', 'lock', 'grant_access'].includes(normalizedCommandType) && !resolvedDoorIdentifier) {
      setError('A door or zone identifier is required before queuing this command.');
      return;
    }

    setQueueing(true);
    setError('');
    setSuccessMessage('');

    try {
      const extraPayload = parseJsonInput(vendorForm.payload_json, 'Connector payload');
      const payload = buildVendorControllerPayload({
        device: selectedDevice,
        accessPoint: selectedAccessPoint,
        source: 'admin_vendor_controller_card',
        dryRun: vendorForm.dry_run,
        commandType: normalizedCommandType,
        controllerIdentifier: resolvedControllerIdentifier,
        doorIdentifier: resolvedDoorIdentifier,
        extraPayload,
      });
      const result = await queueVendorControllerCommand({
        deviceId: selectedDevice.id,
        accessPointId: selectedAccessPoint?.id || selectedDevice.access_point_id || null,
        commandType: normalizedCommandType,
        reason: vendorForm.reason.trim() || 'Admin vendor controller test command',
        payload,
        dryRun: vendorForm.dry_run,
      });

      setVendorForm((current) => ({
        ...current,
        controller_identifier: resolvedControllerIdentifier,
        door_identifier: resolvedDoorIdentifier,
      }));
      setSuccessMessage(
        buildVendorControllerCompletionMessage(result, selectedDevice) || 'Vendor controller command queued.',
      );
      await loadCommands();

      if (typeof onCommandQueued === 'function') {
        await onCommandQueued();
      }
    } catch (queueError) {
      setError(normalizeAccessError(queueError, 'Failed to queue the vendor controller command.'));
    } finally {
      setQueueing(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
          >
            <Box>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Vendor controller API connector
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Queue unlock, sync, or refresh commands for controller devices that use SDK, webhook, or polling connectors. An external vendor adapter can claim the queued work using the device key.
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatAccessRefreshLabel(lastLoadedAt, 'Waiting for the first vendor connector sync.')}
              </Typography>
            </Box>
            <Button variant="outlined" size="small" onClick={loadCommands} disabled={loading || queueing}>
              Refresh history
            </Button>
          </Stack>

          {error ? <Alert severity="error">{error}</Alert> : null}
          {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

          {!vendorDevices.length ? (
            <Alert severity="info">
              No vendor-controller-ready devices are registered yet. Save a controller or bridge device with integration mode set to SDK, polling, or webhook, then store vendorProvider, controllerId, doorId, and apiBaseUrl inside Config JSON.
            </Alert>
          ) : (
            <>
              <TextField
                fullWidth
                select
                label="Vendor controller"
                value={vendorForm.device_id}
                onChange={handleFieldChange('device_id')}
              >
                {vendorDevices.map((device) => (
                  <MenuItem key={device.id} value={device.id}>
                    {device.device_name} · {getVendorControllerProviderLabel(device)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                fullWidth
                select
                label="Access point"
                value={vendorForm.access_point_id}
                onChange={handleFieldChange('access_point_id')}
              >
                <MenuItem value="">Use linked access point</MenuItem>
                {accessPointOptions.map((point) => (
                  <MenuItem key={point.id} value={point.id}>
                    {point.branch_name} · {point.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                fullWidth
                select
                label="Command type"
                value={vendorForm.command_type}
                onChange={handleFieldChange('command_type')}
              >
                {vendorCommandOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                fullWidth
                label="Controller identifier"
                value={vendorForm.controller_identifier}
                onChange={handleFieldChange('controller_identifier')}
                helperText={selectedDevice ? `Provider: ${getVendorControllerProviderLabel(selectedDevice)}` : 'Set the controller or panel id expected by the vendor adapter.'}
              />
              <TextField
                fullWidth
                label="Door / zone identifier"
                value={vendorForm.door_identifier}
                onChange={handleFieldChange('door_identifier')}
              />
              <TextField
                fullWidth
                label="Reason / audit note"
                value={vendorForm.reason}
                onChange={handleFieldChange('reason')}
              />
              <TextField
                fullWidth
                label="Connector payload JSON"
                value={vendorForm.payload_json}
                onChange={handleFieldChange('payload_json')}
                multiline
                minRows={4}
                helperText="Optional extra payload for a vendor adapter. Reserved keys like commandType, dryRun, controllerIdentifier, and doorIdentifier are merged automatically."
              />
              <FormControlLabel
                control={(
                  <Switch
                    checked={Boolean(vendorForm.dry_run)}
                    onChange={handleFieldChange('dry_run')}
                  />
                )}
                label="Dry run only"
              />
              <Alert severity="info">
                {vendorPreviewMessage}
              </Alert>
              <Button
                variant="contained"
                onClick={handleQueueCommand}
                disabled={queueing || !selectedDevice}
              >
                {queueLabel}
              </Button>
            </>
          )}

          <Divider />

          <Box>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Recent vendor commands
            </Typography>
            {loading ? (
              <Alert severity="info">Loading vendor controller command history...</Alert>
            ) : null}
            {!loading && !commands.length ? (
              <Alert severity="info">Vendor controller commands will appear here after the first queued request.</Alert>
            ) : null}
            {!loading && commands.length ? (
              <Stack spacing={1.5}>
                {commands.map((command) => (
                  <Box key={command.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1}
                      justifyContent="space-between"
                      alignItems={{ xs: 'flex-start', sm: 'center' }}
                    >
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip
                          label={(command.command_status || 'queued').toUpperCase()}
                          color={commandStatusChipColorMap[command.command_status] || 'default'}
                          size="small"
                        />
                        <Chip
                          label={getVendorCommandTypeLabel(command.command_type).toUpperCase()}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={getVendorControllerProviderLabel(command.vendor_provider)}
                          size="small"
                          color="secondary"
                        />
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {formatDateTime(command.created_at)}
                      </Typography>
                    </Stack>
                    <Typography variant="subtitle2" fontWeight={700} mt={1}>
                      {command.device_name || 'Vendor controller'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {command.device_key ? `${command.device_key} • ` : ''}
                      {command.branch_name || 'Main Branch'}
                      {command.access_point_name ? ` • ${command.access_point_name}` : ''}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.75 }}>
                      Controller: {command.controller_identifier || '—'} • Door: {command.door_identifier || '—'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                      Reason: {command.requested_reason || 'No reason provided'}
                    </Typography>
                    {command.command_payload ? (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, wordBreak: 'break-word' }}>
                        Payload: {formatPayloadPreview(command.command_payload)}
                      </Typography>
                    ) : null}
                    {command.result_payload && Object.keys(command.result_payload || {}).length ? (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, wordBreak: 'break-word' }}>
                        Result: {formatPayloadPreview(command.result_payload)}
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
            ) : null}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
