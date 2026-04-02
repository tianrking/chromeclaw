(() => {
  const state = (window.__chromeclawWsTap = window.__chromeclawWsTap || {
    installed: false,
    enabled: false,
    maxEvents: 400,
    includeBinary: false,
    seq: 0,
    events: []
  });

  function previewData(data) {
    if (typeof data === 'string') return data.slice(0, 2000);
    if (data instanceof ArrayBuffer) return `[ArrayBuffer ${data.byteLength} bytes]`;
    if (ArrayBuffer.isView(data)) return `[TypedArray ${data.byteLength} bytes]`;
    if (data instanceof Blob) return `[Blob ${data.size} bytes type=${data.type || ''}]`;
    return `[${Object.prototype.toString.call(data)}]`;
  }

  function pushEvent(ev) {
    if (!state.enabled) return;
    state.events.push({
      id: ++state.seq,
      ts: Date.now(),
      ...ev
    });
    if (state.events.length > state.maxEvents) {
      state.events.splice(0, state.events.length - state.maxEvents);
    }
  }

  function install() {
    if (state.installed) return;
    state.installed = true;
    const NativeWebSocket = window.WebSocket;
    if (typeof NativeWebSocket !== 'function') return;

    function WrappedWebSocket(url, protocols) {
      const ws =
        protocols !== undefined
          ? new NativeWebSocket(url, protocols)
          : new NativeWebSocket(url);

      const wsUrl = String(url || '');
      ws.addEventListener('message', (event) => {
        if (!state.includeBinary && typeof event.data !== 'string') return;
        pushEvent({
          direction: 'in',
          url: wsUrl,
          dataPreview: previewData(event.data),
          binary: typeof event.data !== 'string'
        });
      });
      ws.addEventListener('open', () => pushEvent({ direction: 'meta', url: wsUrl, dataPreview: '[open]' }));
      ws.addEventListener('close', () => pushEvent({ direction: 'meta', url: wsUrl, dataPreview: '[close]' }));
      ws.addEventListener('error', () => pushEvent({ direction: 'meta', url: wsUrl, dataPreview: '[error]' }));

      const nativeSend = ws.send.bind(ws);
      ws.send = function patchedSend(data) {
        if (state.includeBinary || typeof data === 'string') {
          pushEvent({
            direction: 'out',
            url: wsUrl,
            dataPreview: previewData(data),
            binary: typeof data !== 'string'
          });
        }
        return nativeSend(data);
      };

      return ws;
    }

    WrappedWebSocket.prototype = NativeWebSocket.prototype;
    Object.setPrototypeOf(WrappedWebSocket, NativeWebSocket);
    window.WebSocket = WrappedWebSocket;
  }

  function tap({ enabled = true, maxEvents = 400, includeBinary = false } = {}) {
    install();
    state.enabled = Boolean(enabled);
    state.maxEvents = Math.max(20, Math.min(3000, Number(maxEvents) || 400));
    state.includeBinary = Boolean(includeBinary);
    return {
      ok: true,
      enabled: state.enabled,
      installed: state.installed,
      maxEvents: state.maxEvents,
      includeBinary: state.includeBinary,
      buffered: state.events.length
    };
  }

  function getEvents({ limit = 80, clear = false } = {}) {
    const cap = Math.max(1, Math.min(1000, Number(limit) || 80));
    const out = state.events.slice(-cap);
    if (clear) state.events = [];
    return {
      ok: true,
      enabled: state.enabled,
      installed: state.installed,
      count: out.length,
      events: out
    };
  }

  function clearEvents() {
    const count = state.events.length;
    state.events = [];
    return { ok: true, cleared: count };
  }

  window.ChromeClawWebSocketTap = { tap, getEvents, clearEvents };
})();
