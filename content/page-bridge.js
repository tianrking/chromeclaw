(() => {
  const REQUEST_EVENT = 'farito:page-eval-request';
  const RESPONSE_EVENT = 'farito:page-eval-response';
  const MARKER = '__faritoBridgeInstalled';

  function installBridge() {
    if (window[MARKER]) return;
    window[MARKER] = true;

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.textContent = `(() => {
      if (window.__faritoPageBridgeReady) return;
      window.__faritoPageBridgeReady = true;

      function serialize(value) {
        try {
          return JSON.parse(JSON.stringify(value));
        } catch (error) {
          return { __nonSerializable: true, preview: String(value), error: String(error) };
        }
      }

      window.addEventListener('${REQUEST_EVENT}', async (event) => {
        const payload = event && event.detail ? event.detail : {};
        const id = payload.id;
        if (!id) return;

        try {
          const fn = new Function('args', '"use strict";\\n' + String(payload.code || 'return null;'));
          const out = await fn(payload.args || {});
          window.dispatchEvent(
            new CustomEvent('${RESPONSE_EVENT}', { detail: { id, ok: true, result: serialize(out) } })
          );
        } catch (error) {
          window.dispatchEvent(
            new CustomEvent('${RESPONSE_EVENT}', {
              detail: { id, ok: false, error: String(error), stack: error && error.stack ? String(error.stack) : '' }
            })
          );
        }
      });
    })();`;

    (document.documentElement || document.head || document.body).appendChild(script);
    script.remove();
  }

  async function evalInPageWorld({ code, args = {}, timeoutMs = 5000 } = {}) {
    if (!code || typeof code !== 'string') {
      return { ok: false, error: 'code(string) is required' };
    }

    installBridge();

    const id = `cc-eval-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ttl = Math.max(200, Math.min(30000, Number(timeoutMs) || 5000));

    return new Promise((resolve) => {
      const onResponse = (event) => {
        const detail = event && event.detail ? event.detail : {};
        if (detail.id !== id) return;
        cleanup();
        resolve(detail.ok ? { ok: true, result: detail.result } : { ok: false, error: detail.error, stack: detail.stack || '' });
      };

      const timer = setTimeout(() => {
        cleanup();
        resolve({ ok: false, error: 'Page-world eval timeout' });
      }, ttl);

      const cleanup = () => {
        clearTimeout(timer);
        window.removeEventListener(RESPONSE_EVENT, onResponse, false);
      };

      window.addEventListener(RESPONSE_EVENT, onResponse, false);
      window.dispatchEvent(
        new CustomEvent(REQUEST_EVENT, {
          detail: { id, code, args }
        })
      );
    });
  }

  window.FaritoPageBridge = { evalInPageWorld };
})();
