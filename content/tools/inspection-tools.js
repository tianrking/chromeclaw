(() => {
  const { D, truncate } = window.ChromeClawToolShared;
  const registry = window.ChromeClawPageToolRegistry;

  function getMetaMap() {
    const metas = Array.from(document.querySelectorAll('meta'));
    const map = {};
    for (const meta of metas) {
      const key =
        meta.getAttribute('name') ||
        meta.getAttribute('property') ||
        meta.getAttribute('http-equiv');
      if (!key) continue;
      map[key] = meta.getAttribute('content') || '';
    }
    return map;
  }

  function listLinks(limit = 200) {
    return D.safeQueryAll('a[href]')
      .slice(0, limit)
      .map((el) => ({
        ...D.serializeElement(el),
        href: el.href,
        rel: el.getAttribute('rel') || '',
        target: el.getAttribute('target') || ''
      }));
  }

  function listImages(limit = 120) {
    return D.safeQueryAll('img')
      .slice(0, limit)
      .map((img) => ({
        ...D.serializeElement(img),
        src: img.currentSrc || img.src || '',
        alt: img.alt || '',
        width: img.naturalWidth || img.width || 0,
        height: img.naturalHeight || img.height || 0,
        loading: img.loading || ''
      }));
  }

  function listTables(limit = 40) {
    return D.safeQueryAll('table')
      .slice(0, limit)
      .map((table) => {
        const headers = D.safeQueryAll('th', table)
          .map((th) => D.textOf(th))
          .filter(Boolean);
        const rows = Array.from(table.querySelectorAll('tr'))
          .slice(0, 12)
          .map((tr) =>
            Array.from(tr.querySelectorAll('th,td'))
              .slice(0, 12)
              .map((cell) => D.textOf(cell))
          );
        return {
          ...D.serializeElement(table),
          headers,
          previewRows: rows
        };
      });
  }

  function listForms(limit = 40) {
    return D.safeQueryAll('form')
      .slice(0, limit)
      .map((form) => ({
        ...D.serializeElement(form),
        action: form.getAttribute('action') || '',
        method: (form.getAttribute('method') || 'get').toLowerCase(),
        fields: Array.from(form.querySelectorAll('input,textarea,select'))
          .slice(0, 80)
          .map((field) => ({
            ...D.serializeElement(field),
            tag: field.tagName.toLowerCase(),
            type: field.getAttribute('type') || '',
            name: field.getAttribute('name') || '',
            placeholder: field.getAttribute('placeholder') || '',
            ariaLabel: field.getAttribute('aria-label') || '',
            required: field.required || false,
            disabled: field.disabled || false,
            label: D.getAssociatedLabel(field)
          }))
      }));
  }

  function listScripts(limit = 100) {
    return D.safeQueryAll('script')
      .slice(0, limit)
      .map((s) => ({
        src: s.src || '',
        type: s.type || '',
        async: !!s.async,
        defer: !!s.defer,
        inlineChars: s.src ? 0 : (s.textContent || '').length
      }));
  }

  function listButtons(limit = 120) {
    return D.safeQueryAll(
      'button,[role="button"],input[type="submit"],input[type="button"]'
    )
      .slice(0, limit)
      .map((el) => ({
        ...D.serializeElement(el),
        disabled: !!el.disabled
      }));
  }

  function listIframes(limit = 40) {
    return D.safeQueryAll('iframe')
      .slice(0, limit)
      .map((frame) => ({
        ...D.serializeElement(frame),
        src: frame.getAttribute('src') || '',
        title: frame.getAttribute('title') || '',
        name: frame.getAttribute('name') || ''
      }));
  }

  function listHeadings(limit = 120) {
    return D.safeQueryAll('h1,h2,h3,h4,h5,h6')
      .slice(0, limit)
      .map((el) => ({
        ...D.serializeElement(el),
        level: el.tagName.toLowerCase()
      }));
  }

  function getAccessibilityOutline(limit = 160) {
    const selectors = [
      'main',
      'nav',
      'header',
      'footer',
      'aside',
      '[role]',
      '[aria-label]',
      '[aria-labelledby]'
    ].join(',');

    return D.safeQueryAll(selectors)
      .slice(0, Math.max(1, Math.min(500, Number(limit) || 160)))
      .map((el) => ({
        ...D.serializeElement(el),
        role: el.getAttribute('role') || '',
        ariaLabel: el.getAttribute('aria-label') || '',
        ariaLabelledBy: el.getAttribute('aria-labelledby') || '',
        landmark: ['main', 'nav', 'header', 'footer', 'aside'].includes(
          el.tagName.toLowerCase()
        )
      }));
  }

  function getSnapshot({ profile = 'full' } = {}) {
    const fast = String(profile || 'full').toLowerCase() === 'fast';
    const headingLimit = fast ? 36 : 80;
    const paragraphLimit = fast ? 70 : 160;
    const linkLimit = fast ? 60 : 160;
    const imageLimit = fast ? 40 : 80;
    const formLimit = fast ? 14 : 30;
    const buttonLimit = fast ? 36 : 80;
    const tableLimit = fast ? 8 : 20;
    const iframeLimit = fast ? 8 : 20;
    const accessibilityLimit = fast ? 48 : 120;
    const scriptLimit = fast ? 24 : 60;
    const resourceLimit = fast ? 24 : 60;

    const selectedText = String(window.getSelection() || '').slice(0, 10000);
    const paragraphs = D.safeQueryAll('p,article li,main li')
      .slice(0, paragraphLimit)
      .map((el) => D.textOf(el))
      .filter(Boolean);

    const resourceHints = performance
      .getEntriesByType('resource')
      .slice(-resourceLimit)
      .map((entry) => ({
        name: entry.name,
        initiatorType: entry.initiatorType,
        duration: Math.round(entry.duration)
      }));

    return {
      title: document.title,
      url: location.href,
      origin: location.origin,
      lang: document.documentElement.lang || '',
      meta: getMetaMap(),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollX: Math.round(window.scrollX),
        scrollY: Math.round(window.scrollY)
      },
      selectedText,
      headings: listHeadings(headingLimit),
      paragraphs,
      links: listLinks(linkLimit),
      images: listImages(imageLimit),
      forms: listForms(formLimit),
      buttons: listButtons(buttonLimit),
      tables: listTables(tableLimit),
      iframes: listIframes(iframeLimit),
      accessibility: getAccessibilityOutline(accessibilityLimit),
      scripts: listScripts(scriptLimit),
      resourceHints,
      stats: {
        domNodes: document.getElementsByTagName('*').length,
        scripts: document.scripts.length,
        images: document.images.length,
        forms: document.forms.length,
        inputs: document.querySelectorAll('input,textarea,select').length,
        links: document.links.length
      },
      lifecycle: {
        readyState: document.readyState,
        hookQueueSize: Array.isArray(window.__chromeclawHookQueue)
          ? window.__chromeclawHookQueue.length
          : 0,
        hookEvents: Array.isArray(window.__chromeclawRuntime?.hooks)
          ? window.__chromeclawRuntime.hooks.slice(-8)
          : []
      },
      profile: fast ? 'fast' : 'full'
    };
  }

  function getPageContext({ includeGlobals = false, globalKeys = [] } = {}) {
    const active =
      document.activeElement instanceof HTMLElement
        ? D.serializeElement(document.activeElement)
        : null;
    const stylesheets = Array.from(document.styleSheets || [])
      .slice(0, 120)
      .map((sheet) => {
        let rules = null;
        let error = '';
        try {
          rules = sheet.cssRules ? sheet.cssRules.length : 0;
        } catch (err) {
          error = String(err);
        }
        return {
          href: sheet.href || '',
          disabled: !!sheet.disabled,
          media: sheet.media ? String(sheet.media.mediaText || '') : '',
          rules,
          error
        };
      });

    const perf =
      performance
        .getEntriesByType('navigation')
        .slice(0, 1)
        .map((entry) => ({
          type: entry.type,
          startTime: Math.round(entry.startTime),
          duration: Math.round(entry.duration),
          domComplete: Math.round(entry.domComplete || 0),
          domInteractive: Math.round(entry.domInteractive || 0),
          transferSize: Number(entry.transferSize || 0)
        }))[0] || null;

    const out = {
      ok: true,
      location: {
        href: location.href,
        origin: location.origin,
        protocol: location.protocol,
        host: location.host,
        pathname: location.pathname,
        search: location.search,
        hash: location.hash
      },
      document: {
        title: document.title,
        referrer: document.referrer || '',
        readyState: document.readyState,
        hasFocus: document.hasFocus(),
        visibilityState: document.visibilityState,
        characterSet: document.characterSet || '',
        compatMode: document.compatMode || '',
        activeElement: active
      },
      window: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
        scrollX: Math.round(window.scrollX),
        scrollY: Math.round(window.scrollY),
        historyLength: history.length
      },
      navigator: {
        language: navigator.language || '',
        languages: Array.isArray(navigator.languages)
          ? navigator.languages.slice(0, 8)
          : [],
        platform: navigator.platform || '',
        userAgent: navigator.userAgent || '',
        onLine: navigator.onLine
      },
      performance: perf,
      stylesheets,
      runtime: {
        hooks: Array.isArray(window.__chromeclawRuntime?.hooks)
          ? window.__chromeclawRuntime.hooks.slice(-20)
          : [],
        scriptlets: Array.isArray(window.__chromeclawRuntime?.scriptlets)
          ? window.__chromeclawRuntime.scriptlets.slice(-20)
          : []
      }
    };

    if (includeGlobals) {
      const globals = {};
      const keys =
        Array.isArray(globalKeys) && globalKeys.length
          ? globalKeys
          : ['__NEXT_DATA__', '__INITIAL_STATE__', '__NUXT__'];
      for (const key of keys.slice(0, 30)) {
        try {
          const value = window[key];
          if (value == null) continue;
          globals[key] = truncate(JSON.stringify(value), 6000);
        } catch (error) {
          globals[key] = `[error] ${String(error)}`;
        }
      }
      out.globals = globals;
    }

    return out;
  }

  function getStorage({ maxItems = 120, maxValueChars = 1200 } = {}) {
    const cap = Math.max(1, Math.min(2000, Number(maxItems) || 120));
    const valueCap = Math.max(20, Math.min(20000, Number(maxValueChars) || 1200));

    const dumpStore = (store) => {
      const out = [];
      try {
        for (let i = 0; i < store.length && out.length < cap; i += 1) {
          const key = store.key(i);
          if (key == null) continue;
          out.push({ key, value: truncate(store.getItem(key), valueCap) });
        }
      } catch (error) {
        out.push({ key: '__error__', value: String(error) });
      }
      return out;
    };

    return {
      ok: true,
      localStorage: dumpStore(window.localStorage),
      sessionStorage: dumpStore(window.sessionStorage)
    };
  }

  function getCookieMap() {
    const cookieRaw = document.cookie || '';
    const map = {};
    for (const pair of cookieRaw.split(';')) {
      const idx = pair.indexOf('=');
      if (idx < 0) continue;
      const key = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      if (!key) continue;
      map[key] = value;
    }
    return { ok: true, cookies: map, count: Object.keys(map).length };
  }

  function getStyles({ selector, elementId, text, properties } = {}) {
    const el = D.resolveElement({ selector, elementId, text });
    if (!el) return { ok: false, error: 'Element not found' };
    const computed = getComputedStyle(el);
    const props =
      Array.isArray(properties) && properties.length
        ? properties
        : [
            'display',
            'position',
            'z-index',
            'color',
            'background-color',
            'font-size',
            'font-weight',
            'line-height',
            'width',
            'height',
            'margin',
            'padding',
            'border',
            'opacity',
            'visibility'
          ];

    const style = {};
    for (const p of props) style[p] = computed.getPropertyValue(p);
    return { ok: true, element: D.serializeElement(el), style };
  }

  function getElementHtml({
    selector,
    elementId,
    text,
    mode = 'outerHTML',
    maxChars = 20000
  } = {}) {
    const el = D.resolveElement({ selector, elementId, text });
    if (!el) return { ok: false, error: 'Element not found' };

    let value = '';
    if (mode === 'innerHTML') value = el.innerHTML || '';
    else if (mode === 'text') value = D.textOf(el);
    else value = el.outerHTML || '';

    return {
      ok: true,
      mode,
      element: D.serializeElement(el),
      value: truncate(value, Number(maxChars) || 20000)
    };
  }

  function getHtml({ maxChars = 180000 } = {}) {
    return {
      ok: true,
      html: truncate(document.documentElement.outerHTML || '', Number(maxChars) || 180000)
    };
  }

  function getText({ maxChars = 120000 } = {}) {
    return { ok: true, text: truncate(D.textOf(document.body), Number(maxChars) || 120000) };
  }

  registry.register('page.get_snapshot', (args) => ({ ok: true, snapshot: getSnapshot(args) }));
  registry.register('page.get_page_context', getPageContext);
  registry.register('page.get_html', getHtml);
  registry.register('page.get_text', getText);
  registry.register('page.get_accessibility_outline', ({ limit }) => ({
    ok: true,
    nodes: getAccessibilityOutline(limit)
  }));
  registry.register('page.get_storage', getStorage);
  registry.register('page.get_cookie_map', getCookieMap);
  registry.register('page.get_styles', getStyles);
  registry.register('page.get_element_html', getElementHtml);
})();
