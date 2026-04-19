const ACCESS_STORAGE_PREFIX = 'checkers-gym:access:';

function canUseAccessStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function getAccessStorageKey(key) {
  return `${ACCESS_STORAGE_PREFIX}${key}`;
}

export function readAccessPreference(key, fallbackValue = null) {
  if (!canUseAccessStorage()) {
    return fallbackValue;
  }

  try {
    const rawValue = window.localStorage.getItem(getAccessStorageKey(key));

    if (rawValue === null) {
      return fallbackValue;
    }

    return JSON.parse(rawValue);
  } catch (error) {
    return fallbackValue;
  }
}

export function readTextAccessPreference(key, fallbackValue = '') {
  const value = readAccessPreference(key, fallbackValue);

  return typeof value === 'string' ? value : fallbackValue;
}

export function readBooleanAccessPreference(key, fallbackValue = false) {
  const value = readAccessPreference(key, fallbackValue);

  return typeof value === 'boolean' ? value : fallbackValue;
}

export function writeAccessPreference(key, value) {
  if (!canUseAccessStorage()) {
    return;
  }

  try {
    if (value === undefined) {
      window.localStorage.removeItem(getAccessStorageKey(key));
      return;
    }

    window.localStorage.setItem(getAccessStorageKey(key), JSON.stringify(value));
  } catch (error) {
    // Ignore storage quota and privacy-mode failures.
  }
}

function normalizeErrorText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeAccessError(error, fallbackMessage) {
  if (!error) {
    return fallbackMessage;
  }

  if (typeof error === 'string') {
    return normalizeErrorText(error) || fallbackMessage;
  }

  const candidates = [
    error.message,
    error.error_description,
    error.description,
    error.details,
    error.hint,
    error?.cause?.message,
  ]
    .map((value) => normalizeErrorText(value))
    .filter(Boolean);

  if (!candidates.length) {
    return fallbackMessage;
  }

  const primaryMessage = candidates[0];

  if (/failed to fetch|network request failed|network error/i.test(primaryMessage)) {
    return 'Network request failed. Check your connection and try again.';
  }

  return primaryMessage;
}

function normalizeDuplicateValue(value) {
  return String(value || '').trim().toUpperCase();
}

export function isRapidRepeatValue({
  previousValue = '',
  nextValue = '',
  previousTimestamp = 0,
  cooldownMs = 2500,
}) {
  const normalizedPreviousValue = normalizeDuplicateValue(previousValue);
  const normalizedNextValue = normalizeDuplicateValue(nextValue);

  if (!normalizedPreviousValue || !normalizedNextValue) {
    return false;
  }

  if (normalizedPreviousValue !== normalizedNextValue) {
    return false;
  }

  return Date.now() - Number(previousTimestamp || 0) < Number(cooldownMs || 0);
}

export function buildDuplicateValueMessage(kind = 'scan') {
  if (kind === 'qr') {
    return 'Duplicate QR scan ignored to avoid a double approval.';
  }

  if (kind === 'rfid') {
    return 'Duplicate RFID / NFC scan ignored to avoid a double approval.';
  }

  return 'Duplicate scan ignored to avoid repeated processing.';
}

export function formatAccessRefreshLabel(value, idleLabel = 'Waiting for the first sync.') {
  if (!value) {
    return idleLabel;
  }

  try {
    return `Last refreshed ${new Date(value).toLocaleString()}`;
  } catch (error) {
    return 'Last refreshed just now.';
  }
}
