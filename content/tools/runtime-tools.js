(() => {
  const registry = window.ChromeClawPageToolRegistry;

  async function evalJs({ code, args, timeoutMs } = {}) {
    if (
      !window.ChromeClawPageBridge ||
      typeof window.ChromeClawPageBridge.evalInPageWorld !== 'function'
    ) {
      return { ok: false, error: 'Page bridge unavailable' };
    }
    return window.ChromeClawPageBridge.evalInPageWorld({
      code,
      args: args || {},
      timeoutMs: Number(timeoutMs) || 5000
    });
  }

  function listScriptlets() {
    if (!window.ChromeClawScriptlets || typeof window.ChromeClawScriptlets.list !== 'function') {
      return { ok: false, error: 'Scriptlet engine unavailable' };
    }
    return { ok: true, items: window.ChromeClawScriptlets.list() };
  }

  function runScriptlet({ name, args } = {}) {
    if (!window.ChromeClawScriptlets || typeof window.ChromeClawScriptlets.run !== 'function') {
      return { ok: false, error: 'Scriptlet engine unavailable' };
    }
    return window.ChromeClawScriptlets.run(name, args || {});
  }

  function tapWebSocket(args = {}) {
    if (!window.ChromeClawWebSocketTap || typeof window.ChromeClawWebSocketTap.tap !== 'function') {
      return { ok: false, error: 'WebSocket tap engine unavailable' };
    }
    return window.ChromeClawWebSocketTap.tap(args);
  }

  function getWebSocketEvents(args = {}) {
    if (
      !window.ChromeClawWebSocketTap ||
      typeof window.ChromeClawWebSocketTap.getEvents !== 'function'
    ) {
      return { ok: false, error: 'WebSocket tap engine unavailable' };
    }
    return window.ChromeClawWebSocketTap.getEvents(args);
  }

  function clearWebSocketEvents() {
    if (
      !window.ChromeClawWebSocketTap ||
      typeof window.ChromeClawWebSocketTap.clearEvents !== 'function'
    ) {
      return { ok: false, error: 'WebSocket tap engine unavailable' };
    }
    return window.ChromeClawWebSocketTap.clearEvents();
  }

  function getNetworkLog(args = {}) {
    if (
      !window.ChromeClawObservability ||
      typeof window.ChromeClawObservability.getNetworkLog !== 'function'
    ) {
      return { ok: false, error: 'Observability engine unavailable' };
    }
    return window.ChromeClawObservability.getNetworkLog(args);
  }

  function getConsoleLog(args = {}) {
    if (
      !window.ChromeClawObservability ||
      typeof window.ChromeClawObservability.getConsoleLog !== 'function'
    ) {
      return { ok: false, error: 'Observability engine unavailable' };
    }
    return window.ChromeClawObservability.getConsoleLog(args);
  }

  function watchDom(args = {}) {
    if (
      !window.ChromeClawObservability ||
      typeof window.ChromeClawObservability.watchDom !== 'function'
    ) {
      return { ok: false, error: 'Observability engine unavailable' };
    }
    return window.ChromeClawObservability.watchDom(args);
  }

  async function getPerformance(args = {}) {
    if (
      !window.ChromeClawObservability ||
      typeof window.ChromeClawObservability.getPerformance !== 'function'
    ) {
      return { ok: false, error: 'Observability engine unavailable' };
    }
    return window.ChromeClawObservability.getPerformance(args);
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
