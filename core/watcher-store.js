const WATCHERS_KEY = 'farito.watchers';

function nowIso() {
  return new Date().toISOString();
}

function normalizeList(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item) => item && typeof item === 'object');
}

async function readRaw() {
  const result = await chrome.storage.local.get(WATCHERS_KEY);
  return normalizeList(result[WATCHERS_KEY]);
}

async function writeRaw(items) {
  await chrome.storage.local.set({ [WATCHERS_KEY]: normalizeList(items) });
}

export async function listWatchers() {
  return readRaw();
}

export async function getWatcherById(id) {
  const items = await readRaw();
  return items.find((w) => w.id === id) || null;
}

export async function upsertWatcher(watcher) {
  const items = await readRaw();
  const idx = items.findIndex((w) => w.id === watcher.id);
  if (idx >= 0) {
    items[idx] = { ...items[idx], ...watcher };
  } else {
    items.push({
      createdAt: nowIso(),
      status: 'active',
      ...watcher
    });
  }
  await writeRaw(items);
  return watcher;
}

export async function patchWatcher(id, patch) {
  const items = await readRaw();
  const idx = items.findIndex((w) => w.id === id);
  if (idx < 0) return null;
  const next = { ...items[idx], ...patch, updatedAt: nowIso() };
  items[idx] = next;
  await writeRaw(items);
  return next;
}

export async function removeWatcher(id) {
  const items = await readRaw();
  const next = items.filter((w) => w.id !== id);
  const removed = next.length !== items.length;
  if (removed) await writeRaw(next);
  return removed;
}

export async function resaveWatchers(items) {
  await writeRaw(items);
}
