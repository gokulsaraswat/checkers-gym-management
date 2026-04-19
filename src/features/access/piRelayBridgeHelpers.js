export const DEFAULT_RELAY_PULSE_MS = 2500;

function normalizeText(value) {
  return String(value || '').trim();
}

export function normalizeRelayPulseMs(value, fallback = DEFAULT_RELAY_PULSE_MS) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.min(Math.max(Math.round(parsedValue), 300), 15000);
}

export function getRelayDeviceLabel(device) {
  if (!device) {
    return 'No relay device selected';
  }

  const key = normalizeText(device.device_key);

  if (key) {
    return `${device.device_name} (${key})`;
  }

  return device.device_name || 'Unnamed relay device';
}

export function getRelayDefaultPulseMs(device) {
  const configPulse = device?.config?.defaultPulseMs
    || device?.config?.default_pulse_ms
    || device?.config?.pulseMs
    || device?.config?.pulse_ms;

  return normalizeRelayPulseMs(configPulse, DEFAULT_RELAY_PULSE_MS);
}

export function getRelayChannel(device) {
  const configuredChannel = device?.config?.relayChannel
    || device?.config?.relay_channel
    || device?.config?.channel;

  const parsedValue = Number(configuredChannel);

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return 1;
  }

  return Math.round(parsedValue);
}

export function buildRelayCommandPayload({
  verifyResult = null,
  scanState = null,
  scannerDevice = null,
  accessPoint = null,
  source = 'staff_scanner_workflow',
  dryRun = false,
}) {
  return {
    source,
    dryRun: Boolean(dryRun),
    scanDetectedFrom: scanState?.detectedFrom || null,
    accessEventId: verifyResult?.accessEventId || null,
    decision: verifyResult?.decision || null,
    memberId: verifyResult?.memberId || null,
    memberName: verifyResult?.fullName || null,
    planName: verifyResult?.planName || null,
    scannerDeviceId: scannerDevice?.id || null,
    scannerDeviceKey: scannerDevice?.device_key || null,
    scannerDeviceName: scannerDevice?.device_name || null,
    accessPointId: accessPoint?.id || null,
    accessPointName: accessPoint?.name || null,
    branchName: accessPoint?.branch_name || scannerDevice?.branch_name || null,
  };
}

export function buildRelayBridgePreview({
  relayDevice = null,
  accessPoint = null,
  pulseMs = DEFAULT_RELAY_PULSE_MS,
  reason = '',
  dryRun = false,
}) {
  if (!relayDevice) {
    return 'Select a Raspberry Pi relay target to queue a pulse after an allowed entry.';
  }

  const channel = getRelayChannel(relayDevice);
  const normalizedPulse = normalizeRelayPulseMs(pulseMs, getRelayDefaultPulseMs(relayDevice));
  const relayBehavior = relayDevice.relay_behavior || 'none';
  const pointLabel = accessPoint?.name ? `${accessPoint.branch_name} · ${accessPoint.name}` : 'linked access point';
  const reasonLabel = normalizeText(reason) || 'front-desk access approval';
  const modeLabel = dryRun ? 'dry-run preview only' : 'live relay pulse';

  return `${modeLabel}: ${relayDevice.device_name} will queue a ${normalizedPulse} ms ${relayBehavior} pulse on channel ${channel} for ${pointLabel}. Reason: ${reasonLabel}.`;
}

export function buildRelayCompletionMessage(commandResult, relayDevice) {
  if (!commandResult?.commandId) {
    return '';
  }

  const deviceName = relayDevice?.device_name || commandResult.deviceName || 'relay target';
  const pulseMs = commandResult.pulseMs || commandResult.pulse_ms || DEFAULT_RELAY_PULSE_MS;
  const status = commandResult.status || commandResult.commandStatus || 'queued';

  return `Relay command queued for ${deviceName} (${pulseMs} ms, status: ${status}).`;
}
