const PRIORITY_ERROR_KEYS = ['error', 'detail', 'message', 'non_field_errors'];

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Unwraps DRF / custom_exception_handler payloads into the inner error object or value.
 */
export function unwrapApiErrorPayload(error) {
  const payload = error?.response?.data ?? error;
  if (isPlainObject(payload) && 'error' in payload && isPlainObject(payload.error)) {
    return payload.error;
  }
  return payload;
}

function firstStringFromValue(value, depth = 0) {
  if (depth > 4 || value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const text = firstStringFromValue(item, depth + 1);
      if (text) return text;
    }
    return '';
  }
  if (isPlainObject(value)) {
    for (const key of PRIORITY_ERROR_KEYS) {
      if (key in value) {
        const text = firstStringFromValue(value[key], depth + 1);
        if (text) return text;
      }
    }
    for (const nested of Object.values(value)) {
      const text = firstStringFromValue(nested, depth + 1);
      if (text) return text;
    }
  }
  return '';
}

/**
 * Extracts a safe, human-readable string message from any Axios or DRF error.
 * Always returns a string so React JSX rendering never crashes with object children.
 */
export function extractErrorMessage(error, fallback = 'Đã xảy ra lỗi. Vui lòng thử lại.') {
  if (!error) return fallback;
  const unwrapped = unwrapApiErrorPayload(error);
  const direct = firstStringFromValue(unwrapped);
  if (direct) return direct;
  if (unwrapped !== error) {
    const outer = firstStringFromValue(error);
    if (outer) return outer;
  }
  return fallback;
}

/**
 * Extracts per-field string error messages using a { apiField: formField } mapping.
 */
export function extractFieldErrors(error, fieldMap = {}) {
  const unwrapped = unwrapApiErrorPayload(error);
  if (!isPlainObject(unwrapped)) return {};

  const result = {};
  for (const [apiField, formField] of Object.entries(fieldMap)) {
    if (apiField in unwrapped) {
      const message = firstStringFromValue(unwrapped[apiField]);
      if (message) {
        result[formField] = message;
      }
    }
  }
  return result;
}

/**
 * Returns true if the unwrapped payload contains a top-level non-field error message.
 */
export function hasFormLevelError(error) {
  const unwrapped = unwrapApiErrorPayload(error);
  if (typeof unwrapped === 'string' || Array.isArray(unwrapped)) {
    return Boolean(firstStringFromValue(unwrapped));
  }
  if (!isPlainObject(unwrapped)) return false;
  return PRIORITY_ERROR_KEYS.some((key) => Boolean(firstStringFromValue(unwrapped[key])));
}
