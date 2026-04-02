(() => {
  const ELEMENT_ATTR = 'data-chromeclaw-id';

  function textOf(el) {
    if (!el) return '';
    return (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function safeQuery(selector) {
    try {
      return document.querySelector(selector);
    } catch {
      return null;
    }
  }

  function safeQueryAll(selector, root = document) {
    try {
      return Array.from(root.querySelectorAll(selector));
    } catch {
      return [];
    }
  }

  function ensureElementId(el) {
    if (!el || !(el instanceof Element)) return null;
    let id = el.getAttribute(ELEMENT_ATTR);
    if (!id) {
      id = `cc-${Math.random().toString(36).slice(2, 10)}`;
      el.setAttribute(ELEMENT_ATTR, id);
    }
    return id;
  }

  function buildSelectorHint(el) {
    if (!el || !(el instanceof Element)) return '';
    if (el.id) return `#${CSS.escape(el.id)}`;

    const parts = [el.tagName.toLowerCase()];
    if (el.classList?.length) {
      parts.push(`.${Array.from(el.classList).slice(0, 3).map((c) => CSS.escape(c)).join('.')}`);
    }
    if (el.getAttribute('name')) {
      parts.push(`[name="${CSS.escape(el.getAttribute('name'))}"]`);
    }
    return parts.join('');
  }

  function serializeElement(el) {
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      id: ensureElementId(el),
      tag: el.tagName.toLowerCase(),
      text: textOf(el).slice(0, 260),
      selectorHint: buildSelectorHint(el),
      rect: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      }
    };
  }

  function getAssociatedLabel(field) {
    const id = field.id;
    if (id) {
      const label = safeQuery(`label[for="${CSS.escape(id)}"]`);
      if (label) return textOf(label).slice(0, 200);
    }
    const wrapped = field.closest('label');
    if (wrapped) return textOf(wrapped).slice(0, 200);
    return '';
  }

  function resolveElement({ selector, elementId, text }) {
    if (elementId) {
      const byId = safeQuery(`[${ELEMENT_ATTR}="${CSS.escape(elementId)}"]`);
      if (byId) return byId;
    }

    if (selector) {
      const bySelector = safeQuery(selector);
      if (bySelector) return bySelector;
    }

    if (text) {
      const needle = text.toLowerCase();
      const candidates = safeQueryAll('button,a,input,textarea,select,[role="button"],[role="link"],[tabindex]');
      return candidates.find((el) => textOf(el).toLowerCase().includes(needle)) || null;
    }

    return null;
  }

  window.ChromeClawDom = {
    ELEMENT_ATTR,
    textOf,
    safeQuery,
    safeQueryAll,
    ensureElementId,
    buildSelectorHint,
    serializeElement,
    getAssociatedLabel,
    resolveElement
  };
})();
