import { runAgent } from './core/agent-loop.js';
import { listPendingApprovals, requestApproval, resolveApproval } from './core/approval-manager.js';
import { getSettings, saveSettings } from './core/storage.js';

chrome.runtime.onInstalled.addListener(async () => {
  await getSettings();
  try {
    if (chrome.sidePanel?.setPanelBehavior) {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    }
  } catch {
    // ignore on unsupported versions
  }
});

chrome.runtime.onStartup?.addListener(async () => {
  try {
    if (chrome.sidePanel?.setPanelBehavior) {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    }
  } catch {
    // ignore
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== 'object') return;

  if (message.type === 'chromeclaw.run_agent') {
    (async () => {
      const settings = await getSettings();
      const result = await runAgent({
        goal: String(message.goal || ''),
        settings,
        tabId: message.tabId,
        requestApproval
      });
      return result;
    })()
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message.type === 'chromeclaw.get_settings') {
    getSettings()
      .then((settings) => sendResponse({ ok: true, settings }))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message.type === 'chromeclaw.save_settings') {
    saveSettings(message.payload || {})
      .then((settings) => sendResponse({ ok: true, settings }))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message.type === 'chromeclaw.approval_list') {
    sendResponse({ ok: true, items: listPendingApprovals() });
    return;
  }

  if (message.type === 'chromeclaw.approval_decide') {
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
