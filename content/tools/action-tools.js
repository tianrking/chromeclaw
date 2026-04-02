(() => {
  const { D, HIGHLIGHT_ID, truncate } = window.FaritoToolShared;
  const registry = window.FaritoPageToolRegistry;

  function queryElements({ selector, text, limit = 20 }) {
    let matches = [];
    if (selector) {
      matches = D.safeQueryAll(selector);
    } else if (text) {
      const needle = text.toLowerCase();
      matches = D.safeQueryAll('*').filter((el) => {
        if (!(el instanceof HTMLElement)) return false;
        const t = D.textOf(el).toLowerCase();
        if (!t.includes(needle)) return false;
        if (t.length > 500 && el.children.length > 10) return false;
        return true;
      });
    }
    return matches
      .slice(0, Math.max(1, Math.min(120, Number(limit) || 20)))
      .map((el) => D.serializeElement(el));
  }

  function resolveWaitTarget({ selector, text } = {}) {
    if (selector) {
      const el = D.safeQuery(selector);
      return el || null;
    }
    if (text) {
      const needle = String(text).toLowerCase();
      const match = D.safeQueryAll('*').find((el) => {
        if (!(el instanceof HTMLElement)) return false;
        const t = D.textOf(el).toLowerCase();
        return t.includes(needle);
      });
      return match || null;
    }
    return null;
  }

  function isVisible(el) {
    if (!(el instanceof HTMLElement)) return false;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  async function waitFor({
    selector,
    text,
    state = 'exists',
    timeoutMs = 8000,
    pollMs = 120
  } = {}) {
    const deadline = Date.now() + Math.max(100, Math.min(60000, Number(timeoutMs) || 8000));
    const interval = Math.max(20, Math.min(2000, Number(pollMs) || 120));
    const wanted = String(state || 'exists').toLowerCase();

    while (Date.now() < deadline) {
      const el = resolveWaitTarget({ selector, text });
      const exists = !!el;
      const visible = exists ? isVisible(el) : false;
      const hidden = !exists || !visible;

      const satisfied =
        (wanted === 'exists' && exists) ||
        (wanted === 'visible' && visible) ||
        (wanted === 'hidden' && hidden);

      if (satisfied) {
        return {
          ok: true,
          matched: exists,
          state: wanted,
          elapsedMs: Math.max(0, Number(timeoutMs) - Math.max(0, deadline - Date.now())),
          element: exists ? D.serializeElement(el) : null
        };
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    return {
      ok: false,
      timeout: true,
      error: `wait_for timeout after ${Math.max(100, Math.min(60000, Number(timeoutMs) || 8000))}ms`,
      selector: selector || '',
      text: text || '',
      state: wanted
    };
  }

  function parseCombo(combo) {
    const out = {
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      shiftKey: false,
      key: '',
      code: ''
    };
    const parts = String(combo || '')
      .split('+')
      .map((p) => p.trim())
      .filter(Boolean);
    for (const partRaw of parts) {
      const part = partRaw.toLowerCase();
      if (part === 'ctrl' || part === 'control') out.ctrlKey = true;
      else if (part === 'cmd' || part === 'meta' || part === 'command') out.metaKey = true;
      else if (part === 'alt' || part === 'option') out.altKey = true;
      else if (part === 'shift') out.shiftKey = true;
      else {
        out.key = partRaw.length === 1 ? partRaw : partRaw;
      }
    }
    if (!out.key) out.key = 'Enter';
    out.code = out.key.length === 1 ? `Key${out.key.toUpperCase()}` : out.key;
    return out;
  }

  function keypress({
    combo,
    key,
    ctrlKey = false,
    metaKey = false,
    altKey = false,
    shiftKey = false,
    selector
  } = {}) {
    const target =
      (selector ? D.safeQuery(selector) : null) ||
      (document.activeElement instanceof HTMLElement ? document.activeElement : document.body);
    if (!target) return { ok: false, error: 'No target element for keypress' };

    const parsed = combo ? parseCombo(combo) : null;
    const finalKey = parsed?.key || String(key || 'Enter');
    const payload = {
      key: finalKey,
      code: parsed?.code || (finalKey.length === 1 ? `Key${finalKey.toUpperCase()}` : finalKey),
      ctrlKey: parsed ? parsed.ctrlKey : Boolean(ctrlKey),
      metaKey: parsed ? parsed.metaKey : Boolean(metaKey),
      altKey: parsed ? parsed.altKey : Boolean(altKey),
      shiftKey: parsed ? parsed.shiftKey : Boolean(shiftKey),
      bubbles: true,
      cancelable: true
    };

    target.dispatchEvent(new KeyboardEvent('keydown', payload));
    target.dispatchEvent(new KeyboardEvent('keypress', payload));
    target.dispatchEvent(new KeyboardEvent('keyup', payload));

    return {
      ok: true,
      combo: combo || finalKey,
      target: D.serializeElement(target),
      payload: {
        key: payload.key,
        ctrlKey: payload.ctrlKey,
        metaKey: payload.metaKey,
        altKey: payload.altKey,
        shiftKey: payload.shiftKey
      }
    };
  }

  function clickElement(args) {
    const el = D.resolveElement(args || {});
    if (!el) return { ok: false, error: 'Element not found' };
    D.ensureElementId(el);
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    el.click();
    return { ok: true, element: D.serializeElement(el) };
  }

  function typeText({ selector, elementId, text = '', clear = true, pressEnter = false }) {
    const el = D.resolveElement({ selector, elementId });
    if (!el) return { ok: false, error: 'Input element not found' };

    const valid =
      el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el.isContentEditable;
    if (!valid) return { ok: false, error: 'Target is not input/textarea/contentEditable' };

    D.ensureElementId(el);
    el.focus();

    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      if (clear) el.value = '';
      el.value += text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      if (pressEnter) {
        el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
      }
    } else {
      if (clear) el.textContent = '';
      document.execCommand('insertText', false, text);
    }

    return { ok: true, element: D.serializeElement(el) };
  }

  function setCheck(args, targetState) {
    const el = D.resolveElement(args || {});
    if (!el) return { ok: false, error: 'Checkbox/radio not found' };
    if (!(el instanceof HTMLInputElement) || !['checkbox', 'radio'].includes(el.type)) {
      return { ok: false, error: 'Target is not checkbox/radio input' };
    }
    el.checked = targetState;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true, checked: el.checked, element: D.serializeElement(el) };
  }

  function selectOption({ selector, elementId, value, text }) {
    const el = D.resolveElement({ selector, elementId });
    if (!el) return { ok: false, error: 'Select element not found' };
    if (!(el instanceof HTMLSelectElement)) return { ok: false, error: 'Target is not a <select>' };

    let matched = null;
    if (value != null) matched = Array.from(el.options).find((opt) => opt.value === String(value));
    if (!matched && text) {
      const needle = String(text).toLowerCase();
      matched = Array.from(el.options).find((opt) => D.textOf(opt).toLowerCase().includes(needle));
    }
    if (!matched) return { ok: false, error: 'No matching option found' };

    el.value = matched.value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));

    return {
      ok: true,
      selected: { value: matched.value, text: D.textOf(matched) },
      element: D.serializeElement(el)
    };
  }

  function scrollPage({ direction = 'down', amount = 600, toSelector } = {}) {
    if (toSelector) {
      const el = D.safeQuery(toSelector);
      if (!el) return { ok: false, error: `Selector not found: ${toSelector}` };
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return { ok: true, mode: 'element', element: D.serializeElement(el) };
    }

    const delta = direction === 'up' ? -Math.abs(amount) : Math.abs(amount);
    window.scrollBy({ top: delta, behavior: 'smooth' });
    return { ok: true, mode: 'delta', scrollY: Math.round(window.scrollY) };
  }

  function extractData({ selector, attr = 'text', limit = 40 }) {
    if (!selector) return { ok: false, error: 'selector is required' };
    const nodes = D.safeQueryAll(selector);
    const items = nodes
      .slice(0, Math.max(1, Math.min(300, Number(limit) || 40)))
      .map((el) => {
        D.ensureElementId(el);
        let value = '';
        if (attr === 'text') value = D.textOf(el);
        else if (attr === 'html') value = truncate(el.innerHTML || '', 6000);
        else value = el.getAttribute(attr) || '';

        return {
          id: el.getAttribute(D.ELEMENT_ATTR),
          tag: el.tagName.toLowerCase(),
          value
        };
      });
    return { ok: true, count: items.length, items };
  }

  function highlight(args) {
    const el = D.resolveElement(args || {});
    if (!el) return { ok: false, error: 'Element not found' };

    const existing = document.getElementById(HIGHLIGHT_ID);
    if (existing) existing.remove();

    const rect = el.getBoundingClientRect();
    const box = document.createElement('div');
    box.id = HIGHLIGHT_ID;
    box.style.position = 'fixed';
    box.style.left = `${rect.left}px`;
    box.style.top = `${rect.top}px`;
    box.style.width = `${rect.width}px`;
    box.style.height = `${rect.height}px`;
    box.style.outline = '3px solid #22c55e';
    box.style.borderRadius = '8px';
    box.style.zIndex = '2147483647';
    box.style.pointerEvents = 'none';
    box.style.boxShadow = '0 0 0 99999px rgba(34,197,94,0.08)';
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 1600);

    return { ok: true, element: D.serializeElement(el) };
  }

  registry.register('page.query_elements', (args) => ({ ok: true, matches: queryElements(args) }));
  registry.register('page.wait_for', waitFor);
  registry.register('page.keypress', keypress);
  registry.register('page.click', clickElement);
  registry.register('page.type', typeText);
  registry.register('page.select', selectOption);
  registry.register('page.check', (args) => setCheck(args, true));
  registry.register('page.uncheck', (args) => setCheck(args, false));
  registry.register('page.scroll', scrollPage);
  registry.register('page.extract', extractData);
  registry.register('page.highlight', highlight);
})();
