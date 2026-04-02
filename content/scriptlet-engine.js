(() => {
  const runtime = (window.__faritoRuntime = window.__faritoRuntime || {
    hooks: [],
    scriptlets: []
  });

  function clamp(value, min, max, fallback) {
    const n = Number(value);
    if (Number.isNaN(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

  const sharedTruncate = window.FaritoToolShared?.truncate;
  function truncate(str, maxChars = 2000) {
    if (typeof sharedTruncate === 'function') return sharedTruncate(str, maxChars);
    const s = String(str || '');
    if (s.length <= maxChars) return s;
    return `${s.slice(0, maxChars)}...[+${s.length - maxChars} chars]`;
  }

  const scriptlets = [
    {
      name: 'capture_boot_context',
      risk: 'low',
      hooks: ['document_start', 'document_end', 'document_idle'],
      description: 'Record lifecycle timing and critical bootstrap context.',
      run: ({ hook }) => {
        const now = Date.now();
        const item = {
          hook: hook || 'manual',
          ts: now,
          href: location.href,
          title: document.title,
          readyState: document.readyState,
          domNodes: document.getElementsByTagName('*').length
        };
        runtime.hooks.push(item);
        return item;
      }
    },
    {
      name: 'collect_forms',
      risk: 'low',
      hooks: [],
      description: 'Extract all forms and their field metadata.',
      run: ({ maxForms = 40, maxFields = 120 } = {}) => {
        const forms = Array.from(document.querySelectorAll('form')).slice(0, clamp(maxForms, 1, 200, 40));
        const out = forms.map((form) => ({
          action: form.getAttribute('action') || '',
          method: (form.getAttribute('method') || 'get').toLowerCase(),
          id: form.id || '',
          className: form.className || '',
          fields: Array.from(form.querySelectorAll('input,textarea,select,button'))
            .slice(0, clamp(maxFields, 1, 500, 120))
            .map((field) => ({
              tag: field.tagName.toLowerCase(),
              type: field.getAttribute('type') || '',
              name: field.getAttribute('name') || '',
              id: field.id || '',
              placeholder: field.getAttribute('placeholder') || '',
              required: !!field.required,
              disabled: !!field.disabled,
              text: truncate(field.textContent || '', 200)
            }))
        }));
        return { forms: out, count: out.length };
      }
    },
    {
      name: 'extract_article',
      risk: 'low',
      hooks: [],
      description: 'Best-effort article extraction from main content containers.',
      run: ({ maxChars = 18000 } = {}) => {
        const candidates = ['article', 'main article', 'main', '[role="main"]', '#content', '.content'];
        let text = '';
        let source = '';
        for (const selector of candidates) {
          const el = document.querySelector(selector);
          if (!el) continue;
          const t = String(el.innerText || '').trim();
          if (t.length > text.length) {
            text = t;
            source = selector;
          }
        }
        if (!text) text = String(document.body?.innerText || '').trim();
        return {
          source: source || 'body',
          text: truncate(text, clamp(maxChars, 500, 100000, 18000)),
          chars: text.length
        };
      }
    },
    {
      name: 'dismiss_overlays',
      risk: 'medium',
      hooks: [],
      description: 'Hide common modal/overlay blockers (best effort).',
      run: ({ maxNodes = 80 } = {}) => {
        const selectors = [
          '[role="dialog"]',
          '.modal',
          '.popup',
          '.overlay',
          '[class*="cookie"]',
          '[id*="cookie"]'
        ];
        const nodes = Array.from(document.querySelectorAll(selectors.join(','))).slice(0, clamp(maxNodes, 1, 300, 80));
        const changed = [];
        for (const el of nodes) {
          const style = getComputedStyle(el);
          if (style.position !== 'fixed' && style.position !== 'sticky') continue;
          if (style.display === 'none' || style.visibility === 'hidden') continue;
          el.dataset.faritoHidden = '1';
          el.style.display = 'none';
          changed.push({
            tag: el.tagName.toLowerCase(),
            id: el.id || '',
            className: truncate(el.className || '', 160)
          });
        }
        return { changedCount: changed.length, changed };
      }
    },
    {
      name: 'annotate_clickables',
      risk: 'medium',
      hooks: [],
      description: 'Temporarily annotate clickable elements for visual debugging.',
      run: ({ limit = 80 } = {}) => {
        const elements = Array.from(
          document.querySelectorAll('a,button,[role="button"],input[type="submit"],input[type="button"]')
        ).slice(0, clamp(limit, 1, 400, 80));
        for (const el of elements) {
          el.style.outline = '2px dashed #0ea5e9';
          el.style.outlineOffset = '1px';
        }
        setTimeout(() => {
          for (const el of elements) {
            el.style.outline = '';
            el.style.outlineOffset = '';
          }
        }, 2200);
        return { annotated: elements.length };
      }
    }
  ];

  const index = new Map(scriptlets.map((s) => [s.name, s]));

  function list() {
    return scriptlets.map((item) => ({
      name: item.name,
      description: item.description,
      risk: item.risk,
      hooks: item.hooks
    }));
  }

  function run(name, args = {}) {
    const item = index.get(String(name || '').trim());
    if (!item) return { ok: false, error: `Unknown scriptlet: ${name}` };
    const started = Date.now();
    const result = item.run(args || {});
    const traceItem = {
      name: item.name,
      hook: args && args.__hook ? String(args.__hook) : '',
      ts: started,
      durationMs: Date.now() - started
    };
    runtime.scriptlets.push(traceItem);
    return { ok: true, name: item.name, risk: item.risk, result, trace: traceItem };
  }

  function runHook(hook) {
    const hookName = String(hook || '').trim();
    if (!hookName) return { ok: false, error: 'hook required' };
    const targets = scriptlets.filter((s) => Array.isArray(s.hooks) && s.hooks.includes(hookName));
    const results = targets.map((s) => run(s.name, { __hook: hookName }));
    return { ok: true, hook: hookName, executed: results.length, results };
  }

  window.FaritoScriptlets = { list, run, runHook };
})();
