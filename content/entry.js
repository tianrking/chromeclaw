(() => {
  function flushQueuedHooks() {
    const queue = Array.isArray(window.__faritoHookQueue) ? window.__faritoHookQueue : [];
    if (!window.FaritoScriptlets || !queue.length) return;
    while (queue.length) {
      const item = queue.shift();
      if (!item || !item.hook) continue;
      try {
        window.FaritoScriptlets.runHook(item.hook);
      } catch {
        // keep content script resilient
      }
    }
  }

  window.addEventListener('farito:hook', (event) => {
    const hook = event?.detail?.hook;
    if (!hook || !window.FaritoScriptlets) return;
    try {
      window.FaritoScriptlets.runHook(hook);
    } catch {
      // ignore hook failures
    }
  });

  flushQueuedHooks();
  if (window.FaritoScriptlets) {
    window.FaritoScriptlets.runHook('document_idle');
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== 'object') return;

    if (message.type === 'farito.ping') {
      sendResponse({ ok: true, url: location.href, title: document.title });
      return;
    }

    if (message.type === 'farito.tool') {
      (async () => {
        try {
          const toolName = message.toolName;
          const args = message.args || {};
          const result = await window.FaritoPageTools.run(toolName, args);
          sendResponse({ ok: true, result });
        } catch (error) {
          sendResponse({ ok: false, error: String(error) });
        }
      })();
      return true;
    }
  });
})();
