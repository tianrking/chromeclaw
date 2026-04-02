const HTTP_HISTORY_KEY = 'farito.http_history';
const HTTP_HISTORY_MAX = 120;

function nowIso() {
  return new Date().toISOString();
}

export async function recordHttpHistory(entry) {
  const result = await chrome.storage.local.get(HTTP_HISTORY_KEY);
  const current = Array.isArray(result[HTTP_HISTORY_KEY]) ? result[HTTP_HISTORY_KEY] : [];
  const next = [
    {
      id: `http-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ts: nowIso(),
      ...entry
    },
    ...current
  ].slice(0, HTTP_HISTORY_MAX);
  await chrome.storage.local.set({ [HTTP_HISTORY_KEY]: next });
  return next[0];
}

export async function listHttpHistory({ limit = 30 } = {}) {
  const result = await chrome.storage.local.get(HTTP_HISTORY_KEY);
  const current = Array.isArray(result[HTTP_HISTORY_KEY]) ? result[HTTP_HISTORY_KEY] : [];
  const cap = Math.max(1, Math.min(HTTP_HISTORY_MAX, Number(limit) || 30));
  return current.slice(0, cap);
}

export async function getHttpHistoryItem(id) {
  const result = await chrome.storage.local.get(HTTP_HISTORY_KEY);
  const current = Array.isArray(result[HTTP_HISTORY_KEY]) ? result[HTTP_HISTORY_KEY] : [];
  return current.find((it) => it.id === id) || null;
}

export async function clearHttpHistory() {
  await chrome.storage.local.set({ [HTTP_HISTORY_KEY]: [] });
  return { ok: true };
}
