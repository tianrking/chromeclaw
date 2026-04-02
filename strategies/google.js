import { SiteStrategy } from './base.js';

export class GoogleStrategy extends SiteStrategy {
  constructor() {
    super('google');
  }

  matches(url) {
    try {
      const u = new URL(url);
      return /(^|\.)google\./i.test(u.hostname);
    } catch {
      return false;
    }
  }

  describe() {
    return 'Google pages strategy (search-focused).';
  }

  getHints() {
    return [
      'Search box selectors commonly include textarea[name="q"] or input[name="q"].',
      'Result links can be queried by #search a[href].',
      'Avoid brittle nth-child selectors due to frequent DOM changes.'
    ];
  }

  getSelectorPresets() {
    return {
      searchInput: 'textarea[name="q"], input[name="q"]',
      resultLinks: '#search a[href], a h3'
    };
  }

  getWorkflowPresets() {
    return [
      'search -> page.type(searchInput) -> page.type(pressEnter=true) -> page.extract(resultLinks)',
      'quick_answer -> page.get_snapshot -> page.get_text'
    ];
  }

  enhanceToolArgs(toolName, args) {
    const out = { ...(args || {}) };
    if (toolName === 'page.type' && !out.selector && !out.elementId) {
      out.selector = 'textarea[name="q"], input[name="q"]';
    }
    if (toolName === 'page.click' && out.text && !out.selector) {
      out.selector = '#search a, a h3';
    }
    return out;
  }
}
