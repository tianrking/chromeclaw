(() => {
  const state = (window.__chromeclawObservability = window.__chromeclawObservability || {
    installed: false,
    network: {
      max: 1200,
      seq: 0,
      logs: []
    },
    console: {
      max: 800,
      seq: 0,
      logs: []
    },
    dom: {
      enabled: false,
      selector: '',
      max: 800,
      seq: 0,
      logs: [],
      observer: null
    },
    performance: {
      lcp: null,
      cls: 0,
      fid: null,
      inp: null,
      longTasks: []
    }
  });

  function pushWithCap(arr, item, max) {
    arr.push(item);
    if (arr.length > max) arr.splice(0, arr.length - max);
  }

  function safePreview(value, maxChars = 400) {
    if (value == null) return '';
    if (typeof value === 'string') return value.slice(0, maxChars);
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    try {
      return JSON.stringify(value).slice(0, maxChars);
    } catch {
      return Object.prototype.toString.call(value);
    }
  }

  function installNetworkHooks() {
    if (window.__chromeclawNetworkHookInstalled) return;
    window.__chromeclawNetworkHookInstalled = true;

    const nativeFetch = window.fetch.bind(window);
    window.fetch = async function chromeclawFetch(input, init = {}) {
      const start = performance.now();
      const method = String(init?.method || 'GET').toUpperCase();
      const url = typeof input === 'string' ? input : String(input?.url || '');
      try {
        const response = await nativeFetch(input, init);
        const durationMs = Math.round(performance.now() - start);
        pushWithCap(
          state.network.logs,
          {
            id: ++state.network.seq,
            ts: Date.now(),
            channel: 'fetch',
            method,
            url,
            status: response.status,
            ok: response.ok,
            type: response.type,
            contentType: response.headers.get('content-type') || '',
            durationMs,
            resourceType: 'fetch'
          },
          state.network.max
        );
        return response;
      } catch (error) {
        const durationMs = Math.round(performance.now() - start);
        pushWithCap(
          state.network.logs,
          {
            id: ++state.network.seq,
            ts: Date.now(),
            channel: 'fetch',
            method,
            url,
            status: 0,
            ok: false,
            error: String(error),
            durationMs,
            resourceType: 'fetch'
          },
          state.network.max
        );
        throw error;
      }
    };

    const NativeXHR = window.XMLHttpRequest;
    if (typeof NativeXHR === 'function') {
      const open = NativeXHR.prototype.open;
      const send = NativeXHR.prototype.send;
      NativeXHR.prototype.open = function patchedOpen(method, url, ...rest) {
        this.__chromeclawMeta = {
          method: String(method || 'GET').toUpperCase(),
          url: String(url || ''),
          start: 0
        };
        return open.call(this, method, url, ...rest);
      };
      NativeXHR.prototype.send = function patchedSend(body) {
        if (this.__chromeclawMeta) this.__chromeclawMeta.start = performance.now();
        this.addEventListener('loadend', () => {
          const meta = this.__chromeclawMeta || {};
          const durationMs = meta.start ? Math.round(performance.now() - meta.start) : 0;
          pushWithCap(
            state.network.logs,
            {
              id: ++state.network.seq,
              ts: Date.now(),
              channel: 'xhr',
              method: meta.method || 'GET',
              url: meta.url || '',
              status: Number(this.status || 0),
              ok: this.status >= 200 && this.status < 400,
              durationMs,
              responseType: this.responseType || '',
              requestBodyPreview: body ? safePreview(body) : '',
              resourceType: 'xmlhttprequest'
            },
            state.network.max
          );
        });
        return send.call(this, body);
      };
    }

    if (typeof PerformanceObserver === 'function') {
      try {
        const po = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            pushWithCap(
              state.network.logs,
              {
                id: ++state.network.seq,
                ts: Date.now(),
                channel: 'resource',
                method: 'GET',
                url: entry.name || '',
                status: null,
                ok: true,
                durationMs: Math.round(entry.duration || 0),
                transferSize: Number(entry.transferSize || 0),
                encodedBodySize: Number(entry.encodedBodySize || 0),
                decodedBodySize: Number(entry.decodedBodySize || 0),
                initiatorType: entry.initiatorType || '',
                resourceType: entry.initiatorType || 'resource'
              },
              state.network.max
            );
          }
        });
        po.observe({ type: 'resource', buffered: true });
      } catch {
        // ignore observer setup failures
      }
    }
  }

  function installConsoleHook() {
    if (window.__chromeclawConsoleHookInstalled) return;
    window.__chromeclawConsoleHookInstalled = true;
    const levels = ['log', 'info', 'warn', 'error', 'debug'];
    for (const level of levels) {
      const native = console[level] ? console[level].bind(console) : null;
      if (!native) continue;
      console[level] = (...args) => {
        pushWithCap(
          state.console.logs,
          {
            id: ++state.console.seq,
            ts: Date.now(),
            level,
            preview: args.map((a) => safePreview(a)).join(' ')
          },
          state.console.max
        );
        return native(...args);
      };
    }
  }

  function installPerformanceObservers() {
    if (window.__chromeclawPerfObsInstalled) return;
    window.__chromeclawPerfObsInstalled = true;
    if (typeof PerformanceObserver !== 'function') return;

    try {
      const lcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          state.performance.lcp = {
            value: Math.round(entry.startTime),
            size: Number(entry.size || 0),
            element: entry.element?.tagName || ''
          };
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
      // ignore
    }

    try {
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.hadRecentInput) continue;
          state.performance.cls += Number(entry.value || 0);
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch {
      // ignore
    }

    try {
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const value = Math.round(entry.processingStart - entry.startTime);
          state.performance.fid = { value, ts: Date.now() };
        }
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch {
      // ignore
    }

    try {
      const eventObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const duration = Math.round(entry.duration || 0);
          if (!state.performance.inp || duration > state.performance.inp.value) {
            state.performance.inp = {
              value: duration,
              name: entry.name || ''
            };
          }
        }
      });
      eventObserver.observe({ type: 'event', buffered: true, durationThreshold: 40 });
    } catch {
      // ignore
    }

    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          pushWithCap(
            state.performance.longTasks,
            {
              ts: Date.now(),
              duration: Math.round(entry.duration || 0),
              name: entry.name || 'longtask'
            },
            200
          );
        }
      });
      longTaskObserver.observe({ type: 'longtask', buffered: true });
    } catch {
      // ignore
    }
  }

  function install() {
    if (state.installed) return;
    state.installed = true;
    installNetworkHooks();
    installConsoleHook();
    installPerformanceObservers();
  }

  function matchesFilter(item, filter) {
    if (!filter) return true;
    if (filter.urlPattern) {
      try {
        const re = new RegExp(String(filter.urlPattern), 'i');
        if (!re.test(item.url || '')) return false;
      } catch {
        if (!String(item.url || '').includes(String(filter.urlPattern))) return false;
      }
    }
    if (filter.statusMin != null && Number(item.status || 0) < Number(filter.statusMin)) return false;
    if (filter.statusMax != null && Number(item.status || 0) > Number(filter.statusMax)) return false;
    if (Array.isArray(filter.resourceTypes) && filter.resourceTypes.length) {
      const set = new Set(filter.resourceTypes.map((v) => String(v)));
      if (!set.has(String(item.resourceType || ''))) return false;
    }
    if (Array.isArray(filter.methods) && filter.methods.length) {
      const set = new Set(filter.methods.map((v) => String(v).toUpperCase()));
      if (!set.has(String(item.method || '').toUpperCase())) return false;
    }
    return true;
  }

  function getNetworkLog({
    limit = 80,
    urlPattern = '',
    statusMin,
    statusMax,
    resourceTypes = [],
    methods = [],
    clear = false
  } = {}) {
    install();
    const filter = { urlPattern, statusMin, statusMax, resourceTypes, methods };
    const cap = Math.max(1, Math.min(2000, Number(limit) || 80));
    const items = state.network.logs.filter((it) => matchesFilter(it, filter)).slice(-cap);
    if (clear) state.network.logs = [];
    return {
      ok: true,
      count: items.length,
      totalBuffered: state.network.logs.length,
      items
    };
  }

  function getConsoleLog({ limit = 120, levels = [], clear = false } = {}) {
    install();
    const cap = Math.max(1, Math.min(2000, Number(limit) || 120));
    const levelSet = Array.isArray(levels) && levels.length
      ? new Set(levels.map((v) => String(v).toLowerCase()))
      : null;
    const items = state.console.logs
      .filter((item) => (!levelSet ? true : levelSet.has(String(item.level || '').toLowerCase())))
      .slice(-cap);
    if (clear) state.console.logs = [];
    return {
      ok: true,
      count: items.length,
      totalBuffered: state.console.logs.length,
      items
    };
  }

  function watchDom({
    action = 'status',
    selector = '',
    maxEvents = 800,
    subtree = true,
    childList = true,
    attributes = true,
    characterData = false
  } = {}) {
    install();
    const mode = String(action || 'status').toLowerCase();

    if (mode === 'clear') {
      const cleared = state.dom.logs.length;
      state.dom.logs = [];
      return { ok: true, action: mode, cleared };
    }

    if (mode === 'stop') {
      if (state.dom.observer) {
        state.dom.observer.disconnect();
        state.dom.observer = null;
      }
      state.dom.enabled = false;
      return {
        ok: true,
        action: mode,
        enabled: false,
        buffered: state.dom.logs.length
      };
    }

    if (mode === 'start') {
      if (state.dom.observer) state.dom.observer.disconnect();
      state.dom.selector = String(selector || '');
      state.dom.max = Math.max(20, Math.min(5000, Number(maxEvents) || 800));
      state.dom.enabled = true;

      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          const target = m.target instanceof Element ? m.target : null;
          if (state.dom.selector && target) {
            if (!target.matches(state.dom.selector) && !target.closest(state.dom.selector)) continue;
          }
          const item = {
            id: ++state.dom.seq,
            ts: Date.now(),
            type: m.type,
            targetTag: target?.tagName?.toLowerCase() || '',
            targetId: target?.id || '',
            targetClass: target?.className ? String(target.className).slice(0, 120) : '',
            added: m.addedNodes?.length || 0,
            removed: m.removedNodes?.length || 0,
            attributeName: m.attributeName || '',
            oldValue: m.oldValue ? String(m.oldValue).slice(0, 240) : ''
          };
          pushWithCap(state.dom.logs, item, state.dom.max);
        }
      });

      observer.observe(document.documentElement || document.body, {
        subtree: Boolean(subtree),
        childList: Boolean(childList),
        attributes: Boolean(attributes),
        characterData: Boolean(characterData),
        attributeOldValue: Boolean(attributes),
        characterDataOldValue: Boolean(characterData)
      });

      state.dom.observer = observer;
      return {
        ok: true,
        action: mode,
        enabled: true,
        selector: state.dom.selector,
        buffered: state.dom.logs.length
      };
    }

    const recent = state.dom.logs.slice(-Math.max(1, Math.min(1000, Number(maxEvents) || 120)));
    return {
      ok: true,
      action: 'status',
      enabled: state.dom.enabled,
      selector: state.dom.selector,
      buffered: state.dom.logs.length,
      recent
    };
  }

  async function estimateFps(sampleMs = 500) {
    const duration = Math.max(150, Math.min(3000, Number(sampleMs) || 500));
    return new Promise((resolve) => {
      const start = performance.now();
      let frames = 0;
      function tick(now) {
        frames += 1;
        if (now - start >= duration) {
          resolve(Math.round((frames * 1000) / (now - start)));
          return;
        }
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  async function getPerformance({ sampleFpsMs = 500 } = {}) {
    install();
    const nav = performance.getEntriesByType('navigation')[0];
    const paints = performance.getEntriesByType('paint');
    const fp = paints.find((p) => p.name === 'first-paint');
    const fcp = paints.find((p) => p.name === 'first-contentful-paint');
    const longTaskCount = state.performance.longTasks.length;
    const longTaskTotalMs = state.performance.longTasks.reduce((a, b) => a + Number(b.duration || 0), 0);
    const fps = await estimateFps(sampleFpsMs);

    return {
      ok: true,
      webVitals: {
        lcp: state.performance.lcp?.value ?? null,
        fid: state.performance.fid?.value ?? null,
        cls: Number(state.performance.cls.toFixed(4)),
        inp: state.performance.inp?.value ?? null,
        fcp: fcp ? Math.round(fcp.startTime) : null,
        fp: fp ? Math.round(fp.startTime) : null
      },
      longTasks: {
        count: longTaskCount,
        totalMs: Math.round(longTaskTotalMs),
        recent: state.performance.longTasks.slice(-20)
      },
      memory: performance.memory
        ? {
            jsHeapSizeLimit: Number(performance.memory.jsHeapSizeLimit || 0),
            totalJSHeapSize: Number(performance.memory.totalJSHeapSize || 0),
            usedJSHeapSize: Number(performance.memory.usedJSHeapSize || 0)
          }
        : null,
      fps,
      navigation: nav
        ? {
            type: nav.type,
            duration: Math.round(nav.duration || 0),
            domInteractive: Math.round(nav.domInteractive || 0),
            domComplete: Math.round(nav.domComplete || 0),
            transferSize: Number(nav.transferSize || 0)
          }
        : null
    };
  }

  window.ChromeClawObservability = {
    install,
    getNetworkLog,
    getConsoleLog,
    watchDom,
    getPerformance
  };

  install();
})();
