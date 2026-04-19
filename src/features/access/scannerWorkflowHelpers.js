const TOKEN_KEYS = ['token', 'accessToken', 'access_token', 'qrToken', 'qr_token'];
const NESTED_KEYS = ['data', 'payload', 'pass', 'accessPass', 'credential'];

function tryParseJson(rawValue) {
  try {
    return JSON.parse(rawValue);
  } catch (error) {
    return null;
  }
}

function getTokenValue(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function extractTokenFromObject(input) {
  if (!input || typeof input !== 'object') {
    return '';
  }

  let token = '';
  let index = 0;

  while (!token && index < TOKEN_KEYS.length) {
    token = getTokenValue(input[TOKEN_KEYS[index]]);
    index += 1;
  }

  if (token) {
    return token;
  }

  index = 0;
  while (!token && index < NESTED_KEYS.length) {
    const nestedValue = input[NESTED_KEYS[index]];
    token = extractTokenFromObject(nestedValue);
    index += 1;
  }

  return token;
}

function extractTokenFromUrl(rawValue) {
  if (!rawValue) {
    return '';
  }

  const parseCandidate = (value, base) => {
    try {
      const parsedUrl = new URL(value, base);
      let token = '';
      let index = 0;

      while (!token && index < TOKEN_KEYS.length) {
        token = getTokenValue(parsedUrl.searchParams.get(TOKEN_KEYS[index]));
        index += 1;
      }

      if (token) {
        return token;
      }

      const hashValue = parsedUrl.hash.replace(/^#/, '');

      if (hashValue.includes('=')) {
        const hashParams = new URLSearchParams(hashValue);
        index = 0;
        while (!token && index < TOKEN_KEYS.length) {
          token = getTokenValue(hashParams.get(TOKEN_KEYS[index]));
          index += 1;
        }
      }

      return token;
    } catch (error) {
      return '';
    }
  };

  const directToken = parseCandidate(rawValue);
  if (directToken) {
    return directToken;
  }

  if (rawValue.includes('?') || rawValue.startsWith('/')) {
    return parseCandidate(rawValue, 'https://scanner.local');
  }

  return '';
}

export function normalizeScannerInput(rawValue = '') {
  const cleanedValue = String(rawValue || '').trim();

  if (!cleanedValue) {
    return {
      rawValue: '',
      token: '',
      detectedFrom: 'empty',
      parsedPayload: null,
    };
  }

  const parsedPayload = tryParseJson(cleanedValue);
  if (parsedPayload) {
    const payloadToken = extractTokenFromObject(parsedPayload);

    if (payloadToken) {
      return {
        rawValue: cleanedValue,
        token: payloadToken,
        detectedFrom: 'json_payload',
        parsedPayload,
      };
    }
  }

  const urlToken = extractTokenFromUrl(cleanedValue);
  if (urlToken) {
    return {
      rawValue: cleanedValue,
      token: urlToken,
      detectedFrom: 'url_payload',
      parsedPayload: null,
    };
  }

  return {
    rawValue: cleanedValue,
    token: cleanedValue,
    detectedFrom: 'raw_token',
    parsedPayload: null,
  };
}

export function getScannerPreviewMessage(scanState) {
  if (!scanState?.rawValue) {
    return 'Keep the cursor in this field and scan a QR code from a wedge scanner, or paste the raw token / JSON payload.';
  }

  if (!scanState.token) {
    return 'The current input could not be parsed into an access token yet.';
  }

  if (scanState.detectedFrom === 'json_payload') {
    return 'Token extracted from a JSON QR payload. The scanner workflow will validate the embedded token.';
  }

  if (scanState.detectedFrom === 'url_payload') {
    return 'Token extracted from a URL payload. The scanner workflow will validate the token query parameter.';
  }

  return 'Raw token detected. Ready to validate.';
}
