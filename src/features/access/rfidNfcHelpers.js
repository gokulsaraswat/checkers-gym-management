const UID_KEYS = [
  'uid',
  'cardUid',
  'card_uid',
  'tagUid',
  'tag_uid',
  'serialNumber',
  'serial_number',
  'identifier',
  'id',
];

const TYPE_KEYS = [
  'credentialType',
  'credential_type',
  'inputType',
  'input_type',
  'readerType',
  'reader_type',
  'format',
];

const NESTED_KEYS = ['data', 'payload', 'card', 'credential', 'reader', 'scan'];

function tryParseJson(rawValue) {
  try {
    return JSON.parse(rawValue);
  } catch (error) {
    return null;
  }
}

export function normalizeCredentialType(value) {
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

  return 'card_uid';
}

export function getCredentialTypeLabel(value) {
  const normalizedType = normalizeCredentialType(value);

  if (normalizedType === 'rfid_uid') {
    return 'RFID UID';
  }

  if (normalizedType === 'nfc_uid') {
    return 'NFC UID';
  }

  return 'RFID / NFC UID';
}

export function normalizeCredentialValue(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '');
}

function extractValueFromObject(input, keys) {
  if (!input || typeof input !== 'object') {
    return '';
  }

  let extractedValue = '';
  let index = 0;

  while (!extractedValue && index < keys.length) {
    const candidateValue = input[keys[index]];

    if (typeof candidateValue === 'string' || typeof candidateValue === 'number') {
      extractedValue = String(candidateValue).trim();
    }

    index += 1;
  }

  if (extractedValue) {
    return extractedValue;
  }

  index = 0;
  while (!extractedValue && index < NESTED_KEYS.length) {
    extractedValue = extractValueFromObject(input[NESTED_KEYS[index]], keys);
    index += 1;
  }

  return extractedValue;
}

function extractUidFromUrl(rawValue) {
  if (!rawValue) {
    return '';
  }

  const parseCandidate = (value, base) => {
    try {
      const parsedUrl = new URL(value, base);
      let extractedValue = '';
      let index = 0;

      while (!extractedValue && index < UID_KEYS.length) {
        extractedValue = String(parsedUrl.searchParams.get(UID_KEYS[index]) || '').trim();
        index += 1;
      }

      if (extractedValue) {
        return extractedValue;
      }

      const hashValue = parsedUrl.hash.replace(/^#/, '');

      if (!hashValue.includes('=')) {
        return '';
      }

      const hashParams = new URLSearchParams(hashValue);
      index = 0;
      while (!extractedValue && index < UID_KEYS.length) {
        extractedValue = String(hashParams.get(UID_KEYS[index]) || '').trim();
        index += 1;
      }

      return extractedValue;
    } catch (error) {
      return '';
    }
  };

  const directValue = parseCandidate(rawValue);

  if (directValue) {
    return directValue;
  }

  if (rawValue.includes('?') || rawValue.startsWith('/')) {
    return parseCandidate(rawValue, 'https://reader.local');
  }

  return '';
}

export function normalizeRfidNfcInput(rawValue = '') {
  const cleanedValue = String(rawValue || '').trim();

  if (!cleanedValue) {
    return {
      rawValue: '',
      token: '',
      normalizedValue: '',
      detectedFrom: 'empty',
      credentialType: 'card_uid',
      parsedPayload: null,
    };
  }

  const parsedPayload = tryParseJson(cleanedValue);

  if (parsedPayload) {
    const payloadUid = normalizeCredentialValue(extractValueFromObject(parsedPayload, UID_KEYS));

    if (payloadUid) {
      return {
        rawValue: cleanedValue,
        token: payloadUid,
        normalizedValue: payloadUid,
        detectedFrom: 'json_payload',
        credentialType: normalizeCredentialType(extractValueFromObject(parsedPayload, TYPE_KEYS)),
        parsedPayload,
      };
    }
  }

  const urlUid = normalizeCredentialValue(extractUidFromUrl(cleanedValue));

  if (urlUid) {
    return {
      rawValue: cleanedValue,
      token: urlUid,
      normalizedValue: urlUid,
      detectedFrom: 'url_payload',
      credentialType: 'card_uid',
      parsedPayload: null,
    };
  }

  const normalizedValue = normalizeCredentialValue(cleanedValue);

  return {
    rawValue: cleanedValue,
    token: normalizedValue,
    normalizedValue,
    detectedFrom: 'raw_uid',
    credentialType: 'card_uid',
    parsedPayload: null,
  };
}

export function getRfidNfcPreviewMessage(scanState) {
  if (!scanState?.rawValue) {
    return 'Keep the cursor in this field and scan an RFID / NFC credential, or paste the raw UID / reader payload.';
  }

  if (!scanState?.token) {
    return 'The current reader input could not be normalized into a UID yet.';
  }

  if (scanState.detectedFrom === 'json_payload') {
    return `${getCredentialTypeLabel(scanState.credentialType)} extracted from a reader JSON payload. Ready to validate.`;
  }

  if (scanState.detectedFrom === 'url_payload') {
    return `${getCredentialTypeLabel(scanState.credentialType)} extracted from a reader URL payload. Ready to validate.`;
  }

  return `${getCredentialTypeLabel(scanState.credentialType)} detected. Ready to validate.`;
}

export function formatCredentialValueMask(value) {
  const normalizedValue = normalizeCredentialValue(value);

  if (!normalizedValue) {
    return '—';
  }

  if (normalizedValue.length <= 4) {
    return `•• ${normalizedValue}`;
  }

  return `•••• ${normalizedValue.slice(-6)}`;
}
