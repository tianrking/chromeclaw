(() => {
  function flushQueuedHooks() {
    const queue = Array.isArray(window.__chromeclawHookQueue) ? window.__chromeclawHookQueue : [];
    if (!window.ChromeClawScriptlets || !queue.length) return;
    while (queue.length) {
      const item = queue.shift();
      if (!item || !item.hook) continue;
      try {
        window.ChromeClawScriptlets.runHook(item.hook);
      } catch {
        // keep content script resilient
      }
    }
  }

  window.addEventListener('chromeclaw:hook', (event) => {
    const hook = event?.detail?.hook;
    if (!hook || !window.ChromeClawScriptlets) return;
    try {
      window.ChromeClawScriptlets.runHook(hook);
    } catch {
      // ignore hook failures
    }
  });

  flushQueuedHooks();
  if (window.ChromeClawScriptlets) {
    window.ChromeClawScriptlets.runHook('document_idle');
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== 'object') return;

    if (message.type === 'chromeclaw.ping') {
      sendResponse({ ok: true, url: location.href, title: document.title });
      return;
    }

    if (message.type === 'chromeclaw.tool') {
      (async () => {
        try {
          const toolName = message.toolName;
          const args = message.args || {};
          const result = await window.ChromeClawPageTools.run(toolName, args);
          sendResponse({ ok: true, result });
        } catch (error) {
          sendResponse({ ok: false, error: String(error) });
        }
      })();
      return true;
    }
  });
})();
