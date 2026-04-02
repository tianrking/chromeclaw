import { runBrowserTool } from './browser-tools/registry.js';
import {
  clearHttpHistory,
  getHttpHistoryItem,
  listHttpHistory,
  recordHttpHistory
} from './http-history.js';

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
    await sendMessageToTab(tabId, { type: 'chromeclaw.ping' });
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

export async function callPageTool(tabId, toolName, args = {}) {
  const response = await sendMessageToTab(tabId, {
    type: 'chromeclaw.tool',
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
    clearHttpHistory
  });
}
