export function safeJsonParse(input, fallback = {}) {
  if (!input) return fallback;
  try {
    return JSON.parse(input);
  } catch {
    return fallback;
  }
}

export function truncateString(input, maxChars = 120000) {
  const text = String(input || '');
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n[TRUNCATED ${text.length - maxChars} chars]`;
}

export function truncate(input, maxChars = 120000) {
  return truncateString(input, maxChars);
}

export function trimLargePayload(payload, maxChars = 180000) {
  const text = JSON.stringify(payload);
  if (text.length <= maxChars) return payload;
  return {
    truncated: true,
    originalChars: text.length,
    preview: text.slice(0, maxChars)
  };
}
