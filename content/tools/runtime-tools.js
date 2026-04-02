(() => {
  const registry = window.FaritoPageToolRegistry;

  async function evalJs({ code, args, timeoutMs } = {}) {
    if (
      !window.FaritoPageBridge ||
      typeof window.FaritoPageBridge.evalInPageWorld !== 'function'
    ) {
      return { ok: false, error: 'Page bridge unavailable' };
    }
    return window.FaritoPageBridge.evalInPageWorld({
      code,
      args: args || {},
      timeoutMs: Number(timeoutMs) || 5000
    });
  }

  function listScriptlets() {
    if (!window.FaritoScriptlets || typeof window.FaritoScriptlets.list !== 'function') {
      return { ok: false, error: 'Scriptlet engine unavailable' };
    }
    return { ok: true, items: window.FaritoScriptlets.list() };
  }

  function runScriptlet({ name, args } = {}) {
    if (!window.FaritoScriptlets || typeof window.FaritoScriptlets.run !== 'function') {
      return { ok: false, error: 'Scriptlet engine unavailable' };
    }
    return window.FaritoScriptlets.run(name, args || {});
  }

  function tapWebSocket(args = {}) {
    if (!window.FaritoWebSocketTap || typeof window.FaritoWebSocketTap.tap !== 'function') {
      return { ok: false, error: 'WebSocket tap engine unavailable' };
    }
    return window.FaritoWebSocketTap.tap(args);
  }

  function getWebSocketEvents(args = {}) {
    if (
      !window.FaritoWebSocketTap ||
      typeof window.FaritoWebSocketTap.getEvents !== 'function'
    ) {
      return { ok: false, error: 'WebSocket tap engine unavailable' };
    }
    return window.FaritoWebSocketTap.getEvents(args);
  }

  function clearWebSocketEvents() {
    if (
      !window.FaritoWebSocketTap ||
      typeof window.FaritoWebSocketTap.clearEvents !== 'function'
    ) {
      return { ok: false, error: 'WebSocket tap engine unavailable' };
    }
    return window.FaritoWebSocketTap.clearEvents();
  }

  function getNetworkLog(args = {}) {
    if (
      !window.FaritoObservability ||
      typeof window.FaritoObservability.getNetworkLog !== 'function'
    ) {
      return { ok: false, error: 'Observability engine unavailable' };
    }
    return window.FaritoObservability.getNetworkLog(args);
  }

  function getConsoleLog(args = {}) {
    if (
      !window.FaritoObservability ||
      typeof window.FaritoObservability.getConsoleLog !== 'function'
    ) {
      return { ok: false, error: 'Observability engine unavailable' };
    }
    return window.FaritoObservability.getConsoleLog(args);
  }

  function watchDom(args = {}) {
    if (
      !window.FaritoObservability ||
      typeof window.FaritoObservability.watchDom !== 'function'
    ) {
      return { ok: false, error: 'Observability engine unavailable' };
    }
    return window.FaritoObservability.watchDom(args);
  }

  async function getPerformance(args = {}) {
    if (
      !window.FaritoObservability ||
      typeof window.FaritoObservability.getPerformance !== 'function'
    ) {
      return { ok: false, error: 'Observability engine unavailable' };
    }
    return window.FaritoObservability.getPerformance(args);
  }

  registry.register('page.eval_js', evalJs);
  registry.register('page.list_scriptlets', listScriptlets);
  registry.register('page.run_scriptlet', runScriptlet);
  registry.register('page.tap_websocket', tapWebSocket);
  registry.register('page.get_websocket_events', getWebSocketEvents);
  registry.register('page.clear_websocket_events', clearWebSocketEvents);
  registry.register('page.get_network_log', getNetworkLog);
  registry.register('page.get_console_log', getConsoleLog);
  registry.register('page.watch_dom', watchDom);
  registry.register('page.get_performance', getPerformance);
})();
