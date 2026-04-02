import { runAgent } from './core/agent-loop.js';
import { listPendingApprovals, requestApproval, resolveApproval } from './core/approval-manager.js';
import { getSettings, saveSettings } from './core/storage.js';
import {
  bootstrapWatcherAlarms,
  evaluateWatcherById,
  evaluateWatchersForTabUpdate
} from './core/watcher-engine.js';

console.info('[Farito] background booted, build=0.1.1, rev=527cb3e');

function normalizeHost(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim().toLowerCase();
}

chrome.runtime.onInstalled.addListener(async () => {
  await getSettings();
  await bootstrapWatcherAlarms();
  try {
    if (chrome.sidePanel?.setPanelBehavior) {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    }
  } catch {
    // ignore on unsupported versions
  }
});

chrome.runtime.onStartup?.addListener(async () => {
  await bootstrapWatcherAlarms();
  try {
    if (chrome.sidePanel?.setPanelBehavior) {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    }
  } catch {
    // ignore
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm?.name || !alarm.name.startsWith('farito:watcher:')) return;
  const id = alarm.name.split(':').pop();
  if (!id) return;
  await evaluateWatcherById(id, {
    runAgentForWatcher: async ({ tabId, goal }) => {
      const settings = await getSettings();
      const result = await runAgent({
        goal,
        settings,
        tabId,
        requestApproval
      });
      return { mode: result.mode, answer: result.answer };
    }
  });
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo?.status !== 'complete') return;
  await evaluateWatchersForTabUpdate(tabId, {
    runAgentForWatcher: async ({ tabId: targetTabId, goal }) => {
      const settings = await getSettings();
      const result = await runAgent({
        goal,
        settings,
        tabId: targetTabId,
        requestApproval
      });
      return { mode: result.mode, answer: result.answer };
    }
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== 'object') return;

  if (message.type === 'farito.run_agent') {
    (async () => {
      const settings = await getSettings();
      const runId =
        String(message.clientRunId || '').trim() ||
        `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const emitEvent = (event) => {
        try {
          chrome.runtime.sendMessage({
            type: 'farito.agent_event',
            runId,
            event,
            at: Date.now()
          });
        } catch {
          // UI may not be open
        }
      };

      const result = await runAgent({
        goal: String(message.goal || ''),
        settings,
        tabId: message.tabId,
        requestApproval,
        onEvent: emitEvent
      });
      return { runId, ...result };
    })()
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message.type === 'farito.get_settings') {
    getSettings()
      .then((settings) => sendResponse({ ok: true, settings }))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message.type === 'farito.save_settings') {
    saveSettings(message.payload || {})
      .then((settings) => sendResponse({ ok: true, settings }))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message.type === 'farito.allow_tool_for_site') {
    (async () => {
      const host = normalizeHost(String(message.host || ''));
      const toolName = String(message.toolName || '');
      if (!host || !toolName) {
        throw new Error('host and toolName are required');
      }

      const settings = await getSettings();
      const currentRules = settings.siteAutoAllow && typeof settings.siteAutoAllow === 'object'
        ? settings.siteAutoAllow
        : {};

      const existing = Array.isArray(currentRules[host]) ? currentRules[host] : [];
      if (!existing.includes(toolName)) {
        existing.push(toolName);
      }

      const next = {
        ...settings,
        siteAutoAllow: {
          ...currentRules,
          [host]: existing
        }
      };

      await saveSettings(next);
      return next;
    })()
      .then((settings) => sendResponse({ ok: true, settings }))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message.type === 'farito.approval_list') {
    sendResponse({ ok: true, items: listPendingApprovals() });
    return;
  }

  if (message.type === 'farito.approval_decide') {
    try {
      const result = resolveApproval(String(message.id || ''), {
        approved: Boolean(message.approved),
        reason: message.reason ? String(message.reason) : undefined,
        patchedArgs: message.patchedArgs
      });
      sendResponse(result);
    } catch (error) {
      sendResponse({ ok: false, error: String(error) });
    }
    return;
  }
});
