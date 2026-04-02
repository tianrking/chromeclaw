import { executeWatcherAction } from './watcher-actions.js';
import { evaluateWatcherCondition } from './watcher-conditions.js';
import {
  getWatcherById,
  listWatchers,
  patchWatcher,
  removeWatcher,
  upsertWatcher
} from './watcher-store.js';

function nowIso() {
  return new Date().toISOString();
}

function toId() {
  return `watcher-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeIntervalSec(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 30;
  return Math.max(5, Math.min(3600, Math.floor(n)));
}

function alarmName(id) {
  return `farito:watcher:${id}`;
}

function normalizeWatcherInput(input = {}) {
  const condition = input.condition && typeof input.condition === 'object' ? input.condition : {};
  const action = input.action && typeof input.action === 'object' ? input.action : {};
  return {
    id: input.id || toId(),
    name: String(input.name || 'Untitled watcher'),
    tabId: Number(input.tabId) || null,
    urlPattern: input.urlPattern ? String(input.urlPattern) : '',
    intervalSec: normalizeIntervalSec(input.intervalSec),
    status: input.status === 'paused' ? 'paused' : 'active',
    condition: {
      type: String(condition.type || 'interval'),
      ...condition
    },
    action: {
      type: String(action.type || 'notify'),
      ...action
    },
    state: input.state && typeof input.state === 'object' ? input.state : {},
    createdAt: input.createdAt || nowIso()
  };
}

async function scheduleWatcherAlarm(watcher) {
  if (!watcher?.id) return;
  if (watcher.status !== 'active') {
    await chrome.alarms.clear(alarmName(watcher.id));
    return;
  }

  await chrome.alarms.create(alarmName(watcher.id), {
    periodInMinutes: Math.max(0.5, watcher.intervalSec / 60)
  });
}

async function sendMessageToTab(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }
      resolve(response);
    });
  });
}

async function ensureContentScript(tabId) {
  try {
    await sendMessageToTab(tabId, { type: 'farito.ping' });
    return true;
  } catch {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: [
          'content/dom-utils.js',
          'content/page-bridge.js',
          'content/tools/registry.js',
          'content/tools/shared.js',
          'content/scriptlet-engine.js',
          'content/tools/inspection-tools.js',
          'content/tools/action-tools.js',
          'content/observability.js',
          'content/tools/runtime-tools.js',
          'content/websocket-tap.js',
          'content/page-tools.js',
          'content/entry.js'
        ]
      });
      return true;
    } catch {
      return false;
    }
  }
}

async function callPageTool(tabId, toolName, args = {}) {
  const response = await sendMessageToTab(tabId, {
    type: 'farito.tool',
    toolName,
    args
  });
  if (!response?.ok) throw new Error(response?.error || 'Unknown page tool error');
  return response.result;
}

async function resolveWatcherTab(watcher) {
  if (watcher.tabId) {
    const t = await chrome.tabs.get(watcher.tabId).catch(() => null);
    if (t) return t;
  }

  if (watcher.urlPattern) {
    const tabs = await chrome.tabs.query({});
    return tabs.find((t) => String(t.url || '').includes(watcher.urlPattern)) || null;
  }

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs?.[0] || null;
}

export async function createWatcher(input = {}) {
  const watcher = normalizeWatcherInput(input);
  await upsertWatcher(watcher);
  await scheduleWatcherAlarm(watcher);
  return watcher;
}

export async function listAllWatchers() {
  return listWatchers();
}

export async function pauseWatcher(id) {
  const watcher = await patchWatcher(id, { status: 'paused' });
  if (!watcher) return null;
  await chrome.alarms.clear(alarmName(id));
  return watcher;
}

export async function resumeWatcher(id) {
  const watcher = await patchWatcher(id, { status: 'active' });
  if (!watcher) return null;
  await scheduleWatcherAlarm(watcher);
  return watcher;
}

export async function removeWatcherById(id) {
  await chrome.alarms.clear(alarmName(id));
  return removeWatcher(id);
}

export async function bootstrapWatcherAlarms() {
  const watchers = await listWatchers();
  await Promise.all(watchers.map((w) => scheduleWatcherAlarm(w)));
}

export async function evaluateWatcherById(id, deps = {}) {
  const watcher = await getWatcherById(id);
  if (!watcher || watcher.status !== 'active') return { ok: false, skipped: true, reason: 'inactive' };

  const tab = await resolveWatcherTab(watcher);
  if (!tab?.id) {
    await patchWatcher(id, { lastCheckedAt: nowIso(), lastResult: { ok: false, reason: 'tab_not_found' } });
    return { ok: false, skipped: true, reason: 'tab_not_found' };
  }

  const condition = await evaluateWatcherCondition(watcher, {
    tab,
    tabId: tab.id,
    ensureContentScript,
    callPageTool
  });

  const state = {
    ...(watcher.state || {}),
    ...(condition.statePatch || {})
  };

  const commonPatch = {
    tabId: tab.id,
    lastCheckedAt: nowIso(),
    state
  };

  if (!condition.matched) {
    await patchWatcher(id, {
      ...commonPatch,
      lastResult: { ok: true, matched: false, reason: condition.reason || 'not_matched' }
    });
    return { ok: true, matched: false, reason: condition.reason || 'not_matched' };
  }

  const actionResult = await executeWatcherAction(watcher, {
    tab,
    tabId: tab.id,
    runAgentForWatcher: deps.runAgentForWatcher
  });

  await patchWatcher(id, {
    ...commonPatch,
    lastTriggeredAt: nowIso(),
    lastResult: {
      ok: Boolean(actionResult?.ok),
      matched: true,
      reason: condition.reason || 'matched',
      action: actionResult
    }
  });

  return { ok: true, matched: true, action: actionResult };
}

export async function evaluateWatchersForTabUpdate(tabId, deps = {}) {
  const watchers = await listWatchers();
  const active = watchers.filter((w) => w.status === 'active' && String(w.condition?.type) === 'url_change');
  const target = active.filter((w) => !w.tabId || Number(w.tabId) === Number(tabId));
  for (const watcher of target) {
    await evaluateWatcherById(watcher.id, deps);
  }
}
