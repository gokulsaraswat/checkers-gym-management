import { isSupabaseConfigured, supabase } from '../../lib/supabaseClient';

const missingConfigError = () => new Error('Supabase is not configured. Add your URL and publishable/anon key to .env first.');

const accessHardwareDeviceSelect = `
  id,
  device_key,
  branch_name,
  access_point_id,
  device_name,
  device_type,
  integration_mode,
  credential_types,
  relay_behavior,
  heartbeat_status,
  last_seen_at,
  notes,
  config,
  is_active,
  created_at,
  updated_at,
  access_point:access_points (
    id,
    name,
    branch_name,
    point_type
  )
`;

function assertConfigured() {
  if (!isSupabaseConfigured || !supabase) {
    throw missingConfigError();
  }
}

function normalizeCredentialTypes(credentialTypes) {
  if (Array.isArray(credentialTypes)) {
    return credentialTypes.filter(Boolean).map((entry) => String(entry).trim().toLowerCase());
  }

  if (typeof credentialTypes === 'string') {
    return credentialTypes
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);
  }

  return [];
}

function normalizePulseDuration(pulseMs) {
  const parsedValue = Number(pulseMs);

  if (!Number.isFinite(parsedValue)) {
    return 2500;
  }

  return Math.min(Math.max(Math.round(parsedValue), 300), 15000);
}

function getDeviceConfigTextValue(device, keys = []) {
  const config = device?.config || {};

  let index = 0;

  while (index < keys.length) {
    const candidateValue = String(config[keys[index]] || '').trim();

    if (candidateValue) {
      return candidateValue;
    }

    index += 1;
  }

  return '';
}

function getVendorControllerProvider(device) {
  return getDeviceConfigTextValue(device, [
    'vendorProvider',
    'vendor_provider',
    'controllerVendor',
    'controller_vendor',
    'provider',
  ]).toLowerCase();
}

function extractSingleRpcResult(data) {
  if (Array.isArray(data)) {
    return data[0] || {};
  }

  return data || {};
}

export function normalizeRfidCredentialType(value) {
  const cleanedValue = String(value || '').trim().toLowerCase();

  if (!cleanedValue) {
    return 'card_uid';
  }

  if (['rfid', 'rfid_uid'].includes(cleanedValue)) {
    return 'rfid_uid';
  }

  if (['nfc', 'nfc_uid'].includes(cleanedValue)) {
    return 'nfc_uid';
  }

  if (['card_uid', 'tag_uid', 'uid'].includes(cleanedValue)) {
    return 'card_uid';
  }

  return cleanedValue;
}

export async function listAccessHardwareDevices() {
  assertConfigured();
  const { data, error } = await supabase
    .from('access_hardware_devices')
    .select(accessHardwareDeviceSelect)
    .order('branch_name', { ascending: true })
    .order('device_name', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function saveAccessHardwareDevice(payload) {
  assertConfigured();

  const normalizedPayload = {
    branch_name: payload.branch_name || 'Main Branch',
    access_point_id: payload.access_point_id || null,
    device_name: payload.device_name,
    device_type: payload.device_type || 'scanner',
    integration_mode: payload.integration_mode || 'bridge',
    credential_types: payload.credential_types || ['access_token'],
    relay_behavior: payload.relay_behavior || 'none',
    heartbeat_status: payload.heartbeat_status || 'offline',
    notes: payload.notes || null,
    config: payload.config || {},
    is_active: Boolean(payload.is_active),
  };

  let query;

  if (payload.id) {
    query = supabase
      .from('access_hardware_devices')
      .update(normalizedPayload)
      .eq('id', payload.id);
  } else {
    query = supabase
      .from('access_hardware_devices')
      .insert(normalizedPayload);
  }

  const { data, error } = await query
    .select(accessHardwareDeviceSelect)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getAccessHardwareSnapshot(days = 7) {
  assertConfigured();
  const { data, error } = await supabase.rpc('get_access_hardware_snapshot', {
    p_days: days,
  });

  if (error) {
    throw error;
  }

  return data || {};
}

export async function listRecentAccessHardwareEvents(limit = 24) {
  assertConfigured();
  const { data, error } = await supabase.rpc('list_recent_access_hardware_events', {
    p_limit: limit,
  });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function logAccessHardwareHeartbeat({ deviceKey, status = 'online', payload = {} }) {
  assertConfigured();
  const { data, error } = await supabase.rpc('log_access_hardware_heartbeat', {
    p_device_key: deviceKey,
    p_status: status,
    p_payload: payload,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function resolveAccessCredential({
  deviceId = null,
  accessPointId = null,
  credentialType = 'access_token',
  credentialValue,
  entryMethod = 'hardware',
  payload = {},
}) {
  assertConfigured();
  const { data, error } = await supabase.rpc('resolve_access_credential', {
    p_device_id: deviceId,
    p_access_point_id: accessPointId,
    p_credential_type: credentialType,
    p_credential_value: credentialValue,
    p_entry_method: entryMethod,
    p_payload: payload,
  });

  if (error) {
    throw error;
  }

  return data || {};
}

export function isQrScannerDevice(device) {
  const supportedCredentialTypes = normalizeCredentialTypes(device?.credential_types);
  const deviceType = String(device?.device_type || '').toLowerCase();
  const supportsQr = supportedCredentialTypes.includes('qr') || supportedCredentialTypes.includes('access_token');
  const supportedDeviceType = ['scanner', 'tablet', 'kiosk', 'bridge'].includes(deviceType);

  return Boolean(device?.is_active) && supportsQr && supportedDeviceType;
}

export function isRfidNfcReaderDevice(device) {
  const supportedCredentialTypes = normalizeCredentialTypes(device?.credential_types)
    .map((entry) => normalizeRfidCredentialType(entry));
  const deviceType = String(device?.device_type || '').toLowerCase();
  const supportsCardCredentials = supportedCredentialTypes.some((entry) => (
    ['card_uid', 'rfid_uid', 'nfc_uid'].includes(entry)
  ));
  const supportedDeviceType = ['reader', 'scanner', 'controller', 'tablet', 'kiosk', 'bridge'].includes(deviceType);

  return Boolean(device?.is_active) && supportsCardCredentials && supportedDeviceType;
}

export function isRelayBridgeDevice(device) {
  const relayBehavior = String(device?.relay_behavior || 'none').toLowerCase();
  const deviceType = String(device?.device_type || '').toLowerCase();
  const integrationMode = String(device?.integration_mode || '').toLowerCase();
  const provider = String(device?.config?.bridgeProvider || device?.config?.bridge_provider || '').toLowerCase();
  const supportedDeviceType = ['relay', 'controller', 'bridge', 'kiosk'].includes(deviceType);
  const supportedIntegration = integrationMode === 'bridge' || provider.includes('raspberry');

  return Boolean(device?.is_active) && relayBehavior !== 'none' && supportedDeviceType && supportedIntegration;
}

export function isVendorControllerDevice(device) {
  const deviceType = String(device?.device_type || '').toLowerCase();
  const integrationMode = String(device?.integration_mode || '').toLowerCase();
  const provider = getVendorControllerProvider(device);
  const apiBaseUrl = getDeviceConfigTextValue(device, [
    'apiBaseUrl',
    'api_base_url',
    'baseUrl',
    'base_url',
    'controllerApiUrl',
    'controller_api_url',
  ]);
  const controllerIdentifier = getDeviceConfigTextValue(device, [
    'controllerId',
    'controller_id',
    'panelId',
    'panel_id',
    'controllerIdentifier',
    'controller_identifier',
  ]);
  const supportedDeviceType = ['controller', 'bridge', 'kiosk'].includes(deviceType);
  const supportedIntegration = ['sdk', 'polling', 'webhook'].includes(integrationMode);

  return Boolean(device?.is_active) && supportedDeviceType && (
    supportedIntegration
    || Boolean(provider)
    || Boolean(apiBaseUrl)
    || Boolean(controllerIdentifier)
  );
}

export async function listQrScannerDevices() {
  const devices = await listAccessHardwareDevices();

  return devices.filter(isQrScannerDevice);
}

export async function listRfidNfcReaderDevices() {
  const devices = await listAccessHardwareDevices();

  return devices.filter(isRfidNfcReaderDevice);
}

export async function listRelayBridgeDevices() {
  const devices = await listAccessHardwareDevices();

  return devices.filter(isRelayBridgeDevice);
}

export async function resolveQrScannerCredential({
  deviceId = null,
  accessPointId = null,
  accessToken,
  payload = {},
}) {
  const cleanedToken = String(accessToken || '').trim();

  if (!cleanedToken) {
    throw new Error('Access token is required.');
  }

  return resolveAccessCredential({
    deviceId,
    accessPointId,
    credentialType: 'qr',
    credentialValue: cleanedToken,
    entryMethod: deviceId ? 'hardware' : 'qr',
    payload,
  });
}

export async function resolveRfidNfcCredential({
  deviceId = null,
  accessPointId = null,
  credentialValue,
  credentialType = 'card_uid',
  payload = {},
}) {
  const cleanedValue = String(credentialValue || '').trim();

  if (!cleanedValue) {
    throw new Error('RFID / NFC credential value is required.');
  }

  return resolveAccessCredential({
    deviceId,
    accessPointId,
    credentialType: normalizeRfidCredentialType(credentialType),
    credentialValue: cleanedValue,
    entryMethod: 'hardware',
    payload,
  });
}

export async function listRecentMemberHardwareCredentials(limit = 18) {
  assertConfigured();
  const { data, error } = await supabase.rpc('list_recent_member_access_hardware_credentials', {
    p_limit: Math.max(Math.min(Number(limit) || 18, 50), 1),
  });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function saveMemberHardwareCredential({
  userId,
  accessPointId = null,
  credentialType = 'card_uid',
  credentialValue,
  credentialLabel = '',
  metadata = {},
}) {
  assertConfigured();
  const cleanedUserId = String(userId || '').trim();
  const cleanedValue = String(credentialValue || '').trim();

  if (!cleanedUserId) {
    throw new Error('Member profile id is required.');
  }

  if (!cleanedValue) {
    throw new Error('Credential value is required.');
  }

  const { data, error } = await supabase.rpc('upsert_member_access_hardware_credential', {
    p_user_id: cleanedUserId,
    p_access_point_id: accessPointId || null,
    p_credential_type: normalizeRfidCredentialType(credentialType),
    p_credential_value: cleanedValue,
    p_credential_label: credentialLabel || null,
    p_metadata: metadata || {},
  });

  if (error) {
    throw error;
  }

  return extractSingleRpcResult(data);
}

export async function revokeMemberHardwareCredential({ credentialId, reason = '' }) {
  assertConfigured();
  const cleanedCredentialId = String(credentialId || '').trim();

  if (!cleanedCredentialId) {
    throw new Error('Credential id is required.');
  }

  const { data, error } = await supabase.rpc('revoke_member_access_hardware_credential', {
    p_credential_id: cleanedCredentialId,
    p_reason: reason || null,
  });

  if (error) {
    throw error;
  }

  return extractSingleRpcResult(data);
}

export async function queueRelayBridgeCommand({
  deviceId,
  accessPointId = null,
  commandType = 'pulse',
  pulseMs = 2500,
  reason = '',
  payload = {},
  dryRun = false,
}) {
  assertConfigured();
  const cleanedDeviceId = String(deviceId || '').trim();

  if (!cleanedDeviceId) {
    throw new Error('A relay bridge device is required.');
  }

  const { data, error } = await supabase.rpc('queue_access_relay_bridge_command', {
    p_device_id: cleanedDeviceId,
    p_access_point_id: accessPointId || null,
    p_command_type: commandType || 'pulse',
    p_pulse_ms: normalizePulseDuration(pulseMs),
    p_reason: reason || null,
    p_payload: {
      ...(payload || {}),
      dryRun: Boolean(dryRun),
    },
  });

  if (error) {
    throw error;
  }

  return data || {};
}

export async function claimRelayBridgeCommands({ deviceKey, limit = 10 }) {
  assertConfigured();
  const cleanedKey = String(deviceKey || '').trim();

  if (!cleanedKey) {
    throw new Error('Device key is required.');
  }

  const { data, error } = await supabase.rpc('claim_relay_bridge_commands', {
    p_device_key: cleanedKey,
    p_limit: Math.max(Math.min(Number(limit) || 10, 25), 1),
  });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function completeRelayBridgeCommand({
  commandId,
  deviceKey,
  status = 'completed',
  result = {},
}) {
  assertConfigured();
  const cleanedCommandId = String(commandId || '').trim();
  const cleanedDeviceKey = String(deviceKey || '').trim();

  if (!cleanedCommandId) {
    throw new Error('Command id is required.');
  }

  if (!cleanedDeviceKey) {
    throw new Error('Device key is required.');
  }

  const { data, error } = await supabase.rpc('complete_relay_bridge_command', {
    p_command_id: cleanedCommandId,
    p_device_key: cleanedDeviceKey,
    p_status: status || 'completed',
    p_result: result || {},
  });

  if (error) {
    throw error;
  }

  return data || {};
}

export async function listRecentRelayBridgeCommands(limit = 18) {
  assertConfigured();
  const { data, error } = await supabase.rpc('list_recent_relay_bridge_commands', {
    p_limit: Math.max(Math.min(Number(limit) || 18, 50), 1),
  });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function listVendorControllerDevices() {
  const devices = await listAccessHardwareDevices();

  return devices.filter(isVendorControllerDevice);
}

export async function queueVendorControllerCommand({
  deviceId,
  accessPointId = null,
  commandType = 'unlock',
  reason = '',
  payload = {},
  dryRun = false,
}) {
  assertConfigured();
  const cleanedDeviceId = String(deviceId || '').trim();

  if (!cleanedDeviceId) {
    throw new Error('A vendor controller device is required.');
  }

  const { data, error } = await supabase.rpc('queue_access_vendor_controller_command', {
    p_device_id: cleanedDeviceId,
    p_access_point_id: accessPointId || null,
    p_command_type: commandType || 'unlock',
    p_reason: reason || null,
    p_payload: {
      ...(payload || {}),
      dryRun: Boolean(dryRun),
    },
  });

  if (error) {
    throw error;
  }

  return data || {};
}

export async function claimVendorControllerCommands({ deviceKey, limit = 10 }) {
  assertConfigured();
  const cleanedKey = String(deviceKey || '').trim();

  if (!cleanedKey) {
    throw new Error('Device key is required.');
  }

  const { data, error } = await supabase.rpc('claim_vendor_controller_commands', {
    p_device_key: cleanedKey,
    p_limit: Math.max(Math.min(Number(limit) || 10, 25), 1),
  });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function completeVendorControllerCommand({
  commandId,
  deviceKey,
  status = 'completed',
  result = {},
}) {
  assertConfigured();
  const cleanedCommandId = String(commandId || '').trim();
  const cleanedDeviceKey = String(deviceKey || '').trim();

  if (!cleanedCommandId) {
    throw new Error('Command id is required.');
  }

  if (!cleanedDeviceKey) {
    throw new Error('Device key is required.');
  }

  const { data, error } = await supabase.rpc('complete_vendor_controller_command', {
    p_command_id: cleanedCommandId,
    p_device_key: cleanedDeviceKey,
    p_status: status || 'completed',
    p_result: result || {},
  });

  if (error) {
    throw error;
  }

  return data || {};
}

export async function listRecentVendorControllerCommands(limit = 18) {
  assertConfigured();
  const { data, error } = await supabase.rpc('list_recent_vendor_controller_commands', {
    p_limit: Math.max(Math.min(Number(limit) || 18, 50), 1),
  });

  if (error) {
    throw error;
  }

  return data || [];
}
