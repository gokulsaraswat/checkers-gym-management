import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import {
  isRfidNfcReaderDevice,
  listRecentMemberHardwareCredentials,
  revokeMemberHardwareCredential,
  saveMemberHardwareCredential,
} from './accessHardwareClient';
import {
  formatAccessRefreshLabel,
  normalizeAccessError,
  readTextAccessPreference,
  writeAccessPreference,
} from './accessStabilizationHelpers';
import {
  formatCredentialValueMask,
  getCredentialTypeLabel,
  normalizeCredentialType,
  normalizeCredentialValue,
} from './rfidNfcHelpers';

const credentialTypeOptions = [
  { value: 'card_uid', label: 'RFID / NFC UID' },
  { value: 'rfid_uid', label: 'RFID UID' },
  { value: 'nfc_uid', label: 'NFC UID' },
];

const emptyCredentialForm = {
  user_id: '',
  access_point_id: '',
  reader_device_id: '',
  credential_type: 'card_uid',
  credential_value: '',
  credential_label: '',
  metadata_json: '{\n  "source": "front-desk-enrollment"\n}',
};

const credentialStatusChipColorMap = {
  active: 'success',
  revoked: 'error',
  lost: 'warning',
  expired: 'default',
  inactive: 'default',
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

function formatPayloadPreview(value) {
  const json = stringifyJson(value);

  if (json.length <= 160) {
    return json;
  }

  return `${json.slice(0, 157)}...`;
}

export default function RfidCredentialRegistryCard({
  accessPoints = [],
  devices = [],
  onCredentialSaved = null,
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revokingCredentialId, setRevokingCredentialId] = useState('');
  const [lastLoadedAt, setLastLoadedAt] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [credentials, setCredentials] = useState([]);
  const [credentialForm, setCredentialForm] = useState(() => ({
    ...emptyCredentialForm,
    access_point_id: readTextAccessPreference('rfid-registry:accessPointId', ''),
    reader_device_id: readTextAccessPreference('rfid-registry:readerDeviceId', ''),
    credential_type: readTextAccessPreference('rfid-registry:credentialType', 'card_uid') || 'card_uid',
  }));

  const accessPointOptions = useMemo(
    () => (accessPoints || []).filter((point) => point.is_active),
    [accessPoints],
  );

  const readerDevices = useMemo(
    () => (devices || []).filter((device) => isRfidNfcReaderDevice(device)),
    [devices],
  );

  const loadCredentials = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const rows = await listRecentMemberHardwareCredentials(16);
      setCredentials(rows || []);
      setLastLoadedAt(new Date().toISOString());
    } catch (fetchError) {
      setError(normalizeAccessError(fetchError, 'Failed to load RFID / NFC credentials.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  useEffect(() => {
    writeAccessPreference('rfid-registry:accessPointId', credentialForm.access_point_id || '');
    writeAccessPreference('rfid-registry:readerDeviceId', credentialForm.reader_device_id || '');
    writeAccessPreference('rfid-registry:credentialType', credentialForm.credential_type || 'card_uid');
  }, [credentialForm.access_point_id, credentialForm.credential_type, credentialForm.reader_device_id]);

  const handleFieldChange = (field) => (event) => {
    const nextValue = event.target.value;

    setCredentialForm((current) => {
      const nextState = {
        ...current,
        [field]: nextValue,
      };

      if (field === 'reader_device_id') {
        const matchedDevice = readerDevices.find((device) => device.id === nextValue) || null;

        if (matchedDevice?.access_point_id && !current.access_point_id) {
          nextState.access_point_id = matchedDevice.access_point_id;
        }

        const configuredType = normalizeCredentialType(
          matchedDevice?.config?.credentialType || matchedDevice?.config?.credential_type,
        );
        if (configuredType) {
          nextState.credential_type = configuredType;
        }
      }

      return nextState;
    });
  };

  const handleSaveCredential = async () => {
    const normalizedUserId = credentialForm.user_id.trim();
    const normalizedCredentialValue = normalizeCredentialValue(credentialForm.credential_value);

    if (!normalizedUserId) {
      setError('Member profile id is required.');
      return;
    }

    if (!normalizedCredentialValue) {
      setError('Credential value / UID is required.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const metadata = parseJsonInput(credentialForm.metadata_json, 'Metadata');
      const saveResult = await saveMemberHardwareCredential({
        userId: normalizedUserId,
        accessPointId: credentialForm.access_point_id || null,
        credentialType: credentialForm.credential_type,
        credentialValue: normalizedCredentialValue,
        credentialLabel: credentialForm.credential_label.trim(),
        metadata: {
          ...(metadata || {}),
          readerDeviceId: credentialForm.reader_device_id || null,
          normalizedCredentialValue,
          source: 'admin_access_hardware_page',
        },
      });

      setCredentialForm((current) => ({
        ...current,
        user_id: '',
        credential_value: '',
        credential_label: '',
      }));
      setSuccessMessage(
        saveResult?.credentialSuffix
          ? `Credential saved: ${formatCredentialValueMask(saveResult.credentialSuffix)}.`
          : 'RFID / NFC credential saved.',
      );

      await loadCredentials();

      if (typeof onCredentialSaved === 'function') {
        await onCredentialSaved();
      }
    } catch (saveError) {
      setError(normalizeAccessError(saveError, 'Failed to save the RFID / NFC credential.'));
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeCredential = async (credentialId) => {
    setRevokingCredentialId(credentialId);
    setError('');
    setSuccessMessage('');

    try {
      await revokeMemberHardwareCredential({
        credentialId,
        reason: 'Revoked from admin access hardware page.',
      });
      setSuccessMessage('RFID / NFC credential revoked.');
      await loadCredentials();

      if (typeof onCredentialSaved === 'function') {
        await onCredentialSaved();
      }
    } catch (revokeError) {
      setError(normalizeAccessError(revokeError, 'Failed to revoke the RFID / NFC credential.'));
    } finally {
      setRevokingCredentialId('');
    }
  };

  const clearForm = () => {
    setCredentialForm((current) => ({
      ...emptyCredentialForm,
      access_point_id: current.access_point_id,
      reader_device_id: current.reader_device_id,
      credential_type: current.credential_type,
    }));
  };

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
                RFID / NFC credential registry
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enroll UID-based credentials against member profiles, keep an audit-friendly label for each card or tag, and revoke credentials without touching the rest of the hardware registry.
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatAccessRefreshLabel(lastLoadedAt, 'Waiting for the first RFID / NFC credential sync.')}
              </Typography>
            </Box>
            <Button variant="outlined" size="small" onClick={loadCredentials} disabled={loading || saving || Boolean(revokingCredentialId)}>
              Refresh registry
            </Button>
          </Stack>

          {error ? <Alert severity="error">{error}</Alert> : null}
          {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={`${readerDevices.length} reader${readerDevices.length === 1 ? '' : 's'} ready`} color="primary" size="small" />
            <Chip label={`${credentials.length} recent credential${credentials.length === 1 ? '' : 's'}`} color="secondary" size="small" />
          </Stack>

          {!readerDevices.length ? (
            <Alert severity="info">
              No RFID / NFC-ready devices are registered yet. You can still pre-enroll credentials now and map a reader later.
            </Alert>
          ) : null}

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Member profile id"
                value={credentialForm.user_id}
                onChange={handleFieldChange('user_id')}
                helperText="Paste the member UUID from admin/member detail screens."
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Credential type"
                value={credentialForm.credential_type}
                onChange={handleFieldChange('credential_type')}
              >
                {credentialTypeOptions.map((option) => (
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
                label="Access point scope"
                value={credentialForm.access_point_id}
                onChange={handleFieldChange('access_point_id')}
              >
                <MenuItem value="">Any staffed point</MenuItem>
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
                label="Enrollment reader"
                value={credentialForm.reader_device_id}
                onChange={handleFieldChange('reader_device_id')}
              >
                <MenuItem value="">Manual / not captured</MenuItem>
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
                label="Credential value / UID"
                value={credentialForm.credential_value}
                onChange={handleFieldChange('credential_value')}
                helperText="Paste the raw UID from the card, reader, or mobile NFC tool."
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Label"
                value={credentialForm.credential_label}
                onChange={handleFieldChange('credential_label')}
                helperText="Example: Front desk tag, Turnstile fob, Coach NFC card"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Metadata JSON"
                value={credentialForm.metadata_json}
                onChange={handleFieldChange('metadata_json')}
                multiline
                minRows={4}
                helperText="Store optional enrollment notes, import source, or reader metadata here."
              />
            </Grid>
          </Grid>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button
              variant="contained"
              onClick={handleSaveCredential}
              disabled={saving || !credentialForm.user_id.trim() || !normalizeCredentialValue(credentialForm.credential_value)}
            >
              {saving ? 'Saving credential...' : 'Save RFID / NFC credential'}
            </Button>
            <Button
              variant="outlined"
              onClick={clearForm}
              disabled={saving}
            >
              Clear form
            </Button>
          </Stack>

          <Divider />

          <Box>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Recent credentials
            </Typography>
            {!loading && !credentials.length ? (
              <Alert severity="info">Saved RFID / NFC credentials will appear here after the first enrollment.</Alert>
            ) : null}
            {credentials.length ? (
              <Stack spacing={1.5}>
                {credentials.map((credential) => (
                  <Box key={credential.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1}
                      justifyContent="space-between"
                      alignItems={{ xs: 'flex-start', sm: 'center' }}
                    >
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip
                          label={(credential.status || 'active').toUpperCase()}
                          color={credentialStatusChipColorMap[credential.status] || 'default'}
                          size="small"
                        />
                        <Chip
                          label={getCredentialTypeLabel(credential.credential_type)}
                          variant="outlined"
                          size="small"
                        />
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {formatDateTime(credential.updated_at || credential.created_at)}
                      </Typography>
                    </Stack>
                    <Typography variant="subtitle2" fontWeight={700} mt={1}>
                      {credential.full_name || credential.user_id || 'Unknown member'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {credential.email || credential.user_id}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.75 }}>
                      UID: {formatCredentialValueMask(credential.credential_suffix)}
                      {credential.credential_label ? ` • ${credential.credential_label}` : ''}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                      {credential.access_point_name ? `Point: ${credential.access_point_name}` : 'Scope: any staffed point'}
                      {credential.branch_name ? ` • ${credential.branch_name}` : ''}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                      Last verified: {formatDateTime(credential.last_verified_at)}
                      {credential.last_seen_at ? ` • Last seen: ${formatDateTime(credential.last_seen_at)}` : ''}
                    </Typography>
                    {credential.metadata ? (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, wordBreak: 'break-word' }}>
                        Metadata: {formatPayloadPreview(credential.metadata)}
                      </Typography>
                    ) : null}
                    <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => handleRevokeCredential(credential.id)}
                        disabled={revokingCredentialId === credential.id || credential.status !== 'active'}
                      >
                        {revokingCredentialId === credential.id ? 'Revoking...' : 'Revoke'}
                      </Button>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            ) : null}
          </Box>

          {loading ? <Alert severity="info">Refreshing RFID / NFC credentials...</Alert> : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
