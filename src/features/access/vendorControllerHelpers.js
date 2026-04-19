const DEFAULT_VENDOR_COMMAND_TYPE = 'unlock';

function normalizeText(value) {
  return String(value || '').trim();
}

function readConfigValue(device, keys = []) {
  const config = device?.config || {};
  let index = 0;

  while (index < keys.length) {
    const candidateValue = normalizeText(config[keys[index]]);

    if (candidateValue) {
      return candidateValue;
    }

    index += 1;
  }

  return '';
}

export function normalizeVendorCommandType(value) {
  const cleanedValue = normalizeText(value).toLowerCase();

  if (!cleanedValue) {
    return DEFAULT_VENDOR_COMMAND_TYPE;
  }

  if (['open', 'open_door', 'pulse'].includes(cleanedValue)) {
    return 'unlock';
  }

  if (['grant', 'grant_access', 'allow'].includes(cleanedValue)) {
    return 'grant_access';
  }

  if (['refresh', 'refresh_device', 'reload'].includes(cleanedValue)) {
    return 'refresh_device';
  }

  if (['unlock', 'lock', 'sync'].includes(cleanedValue)) {
    return cleanedValue;
  }

  return DEFAULT_VENDOR_COMMAND_TYPE;
}

export function getVendorCommandTypeLabel(value) {
  const normalizedType = normalizeVendorCommandType(value);

  if (normalizedType === 'grant_access') {
    return 'Grant access';
  }

  if (normalizedType === 'refresh_device') {
    return 'Refresh device';
  }

  return normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1);
}

export function getVendorControllerProvider(deviceOrProvider) {
  if (!deviceOrProvider) {
    return '';
  }

  if (typeof deviceOrProvider === 'string') {
    return normalizeText(deviceOrProvider).toLowerCase();
  }

  const providerValue = readConfigValue(deviceOrProvider, [
    'vendorProvider',
    'vendor_provider',
    'controllerVendor',
    'controller_vendor',
    'provider',
  ]);

  return providerValue.toLowerCase();
}

export function getVendorControllerProviderLabel(deviceOrProvider) {
  const provider = getVendorControllerProvider(deviceOrProvider);

  if (!provider) {
    return 'Custom API';
  }

  const providerLabelMap = {
    acre: 'Acre',
    axis: 'Axis',
    brivo: 'Brivo',
    custom_api: 'Custom API',
    custom_sdk: 'Custom SDK',
    custom_webhook: 'Custom webhook',
    genea: 'Genea',
    hikvision: 'Hikvision',
    paxton: 'Paxton',
    rosslare: 'Rosslare',
    suprema: 'Suprema',
    zkteco: 'ZKTeco',
  };

  if (providerLabelMap[provider]) {
    return providerLabelMap[provider];
  }

  return provider
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getVendorControllerControllerIdentifier(device) {
  return readConfigValue(device, [
    'controllerId',
    'controller_id',
    'panelId',
    'panel_id',
    'controllerIdentifier',
    'controller_identifier',
  ]);
}

export function getVendorControllerDoorIdentifier(device, accessPoint = null) {
  const configuredIdentifier = readConfigValue(device, [
    'doorId',
    'door_id',
    'doorIdentifier',
    'door_identifier',
    'zoneId',
    'zone_id',
  ]);

  if (configuredIdentifier) {
    return configuredIdentifier;
  }

  return normalizeText(accessPoint?.name);
}

export function buildVendorControllerPayload({
  verifyResult = null,
  accessPoint = null,
  device = null,
  source = 'admin_vendor_controller',
  dryRun = false,
  commandType = DEFAULT_VENDOR_COMMAND_TYPE,
  controllerIdentifier = '',
  doorIdentifier = '',
  extraPayload = {},
}) {
  const payload = {
    source,
    dryRun: Boolean(dryRun),
    commandType: normalizeVendorCommandType(commandType),
    accessEventId: verifyResult?.accessEventId || null,
    decision: verifyResult?.decision || null,
    memberId: verifyResult?.memberId || null,
    memberName: verifyResult?.fullName || null,
    planName: verifyResult?.planName || null,
    deviceId: device?.id || null,
    deviceKey: device?.device_key || null,
    deviceName: device?.device_name || null,
    accessPointId: accessPoint?.id || device?.access_point_id || null,
    accessPointName: accessPoint?.name || null,
    branchName: accessPoint?.branch_name || device?.branch_name || null,
    controllerIdentifier: normalizeText(controllerIdentifier) || getVendorControllerControllerIdentifier(device) || null,
    doorIdentifier: normalizeText(doorIdentifier) || getVendorControllerDoorIdentifier(device, accessPoint) || null,
  };

  const mergedPayload = {
    ...payload,
    ...(extraPayload || {}),
  };

  const sourceValue = normalizeText(mergedPayload.source);
  const controllerValue = normalizeText(
    mergedPayload.controllerIdentifier
      || mergedPayload.controller_id
      || payload.controllerIdentifier,
  );
  const doorValue = normalizeText(
    mergedPayload.doorIdentifier
      || mergedPayload.door_id
      || payload.doorIdentifier,
  );

  return {
    ...mergedPayload,
    source: sourceValue || payload.source,
    dryRun: Boolean(mergedPayload.dryRun),
    commandType: normalizeVendorCommandType(mergedPayload.commandType || payload.commandType),
    controllerIdentifier: controllerValue || null,
    doorIdentifier: doorValue || null,
  };
}

export function buildVendorControllerPreview({
  device = null,
  accessPoint = null,
  commandType = DEFAULT_VENDOR_COMMAND_TYPE,
  reason = '',
  dryRun = false,
  controllerIdentifier = '',
  doorIdentifier = '',
}) {
  if (!device) {
    return 'Select a vendor-ready controller to queue an unlock, sync, or refresh command.';
  }

  const providerLabel = getVendorControllerProviderLabel(device);
  const normalizedCommandType = normalizeVendorCommandType(commandType);
  const pointLabel = accessPoint?.name ? `${accessPoint.branch_name} · ${accessPoint.name}` : 'linked access point';
  const reasonLabel = normalizeText(reason) || 'front-desk controller test';
  const controllerLabel = normalizeText(controllerIdentifier) || getVendorControllerControllerIdentifier(device) || device.device_key || 'device key';
  const doorLabel = normalizeText(doorIdentifier) || getVendorControllerDoorIdentifier(device, accessPoint) || 'configured door';
  const modeLabel = dryRun ? 'dry-run connector preview' : 'live connector dispatch';

  return `${modeLabel}: ${providerLabel} will queue a ${normalizedCommandType.replace(/_/g, ' ')} command for ${device.device_name} (${controllerLabel}) targeting ${doorLabel} at ${pointLabel}. Reason: ${reasonLabel}.`;
}

export function buildVendorControllerCompletionMessage(commandResult, device) {
  if (!commandResult?.commandId) {
    return '';
  }

  const deviceName = device?.device_name || commandResult.deviceName || 'vendor controller';
  const providerLabel = getVendorControllerProviderLabel(commandResult.vendorProvider || device);
  const commandTypeLabel = getVendorCommandTypeLabel(commandResult.commandType || commandResult.command_type);
  const status = commandResult.status || commandResult.commandStatus || 'queued';

  return `${commandTypeLabel} command queued for ${deviceName} via ${providerLabel} (status: ${status}).`;
}
