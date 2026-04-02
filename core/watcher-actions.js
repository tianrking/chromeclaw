function clampText(input, maxChars = 200) {
  const text = String(input || '');
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 1)}…`;
}

export async function executeWatcherAction(watcher, context) {
  const action = watcher?.action || {};
  const actionType = String(action.type || 'notify');

  if (actionType === 'notify') {
    const title = clampText(action.title || `ChromeClaw watcher: ${watcher.name || watcher.id}`, 80);
    const message = clampText(
      action.message ||
        `Condition matched on ${context?.tab?.url || watcher?.urlPattern || 'current site'}.`,
      240
    );
    await chrome.notifications.create({
      type: 'basic',
      title,
      message,
      iconUrl: 'icon128.png'
    });
    return { ok: true, type: actionType, notified: true };
  }

  if (actionType === 'run_agent') {
    if (typeof context?.runAgentForWatcher !== 'function') {
      return { ok: false, type: actionType, error: 'runAgentForWatcher not available' };
    }
    const goal = String(action.goal || '').trim();
    if (!goal) return { ok: false, type: actionType, error: 'action.goal is required' };
    const result = await context.runAgentForWatcher({
      tabId: context.tabId,
      goal,
      watcher
    });
    return { ok: true, type: actionType, run: result || null };
  }

  if (actionType === 'webhook') {
    const url = String(action.url || '').trim();
    if (!url) return { ok: false, type: actionType, error: 'action.url is required' };
    const payload = {
      watcherId: watcher.id,
      watcherName: watcher.name || '',
      condition: watcher.condition || {},
      tabUrl: context?.tab?.url || '',
      timestamp: new Date().toISOString()
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return { ok: res.ok, type: actionType, status: res.status };
  }

  return { ok: false, type: actionType, error: `Unsupported watcher action: ${actionType}` };
}
