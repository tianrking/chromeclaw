import { runBrowserTool } from './browser-tools/registry.js';
import {
  clearHttpHistory,
  getHttpHistoryItem,
  listHttpHistory,
  recordHttpHistory
} from './http-history.js';
import {
  createWatcher,
  listAllWatchers,
  pauseWatcher,
  removeWatcherById,
  resumeWatcher
} from './watcher-engine.js';

export async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs?.[0] || null;
}

export async function sendMessageToTab(tabId, message) {
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

export async function ensureContentScript(tabId) {
  try {
    await sendMessageToTab(tabId, { type: 'farito.ping' });
    return;
  } catch {
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
  }
}

export async function waitForTabLoad(tabId, timeoutMs = 12000) {
  if (!tabId) return { ok: false, error: 'No tabId' };

  const existing = await chrome.tabs.get(tabId).catch(() => null);
  if (!existing) return { ok: false, error: `Tab ${tabId} not found` };
  if (existing.status === 'complete') {
    return { ok: true, tabId, status: 'complete', immediate: true };
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      resolve({ ok: false, timeout: true, tabId, error: `waitForTabLoad timeout (${timeoutMs}ms)` });
    }, Math.max(1000, Number(timeoutMs) || 12000));

    function done(result) {
      clearTimeout(timeout);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      resolve(result);
    }

    function onUpdated(updatedTabId, changeInfo) {
      if (updatedTabId !== tabId) return;
      if (changeInfo.status === 'complete') {
        done({ ok: true, tabId, status: 'complete', immediate: false });
      }
    }

    chrome.tabs.onUpdated.addListener(onUpdated);
  });
}

export async function callPageTool(tabId, toolName, args = {}) {
  const response = await sendMessageToTab(tabId, {
    type: 'farito.tool',
    toolName,
    args
  });

  if (!response?.ok) {
    throw new Error(response?.error || 'Unknown page tool error');
  }

  return response.result;
}

export async function browserTool(toolName, args = {}) {
  async function mustActiveTab() {
    const active = await getActiveTab();
    if (!active) throw new Error('No active tab');
    return active;
  }

  return runBrowserTool(toolName, args, {
    chrome,
    mustActiveTab,
    recordHttpHistory,
    listHttpHistory,
    getHttpHistoryItem,
    clearHttpHistory,
    watchers: {
      createWatcher,
      listWatchers: listAllWatchers,
      pauseWatcher,
      resumeWatcher,
      removeWatcherById
    }
  });
}
