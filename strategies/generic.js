import { SiteStrategy } from './base.js';

export class GenericStrategy extends SiteStrategy {
  constructor() {
    super('generic');
  }

  matches() {
    return true;
  }

  describe() {
    return 'Generic web strategy for arbitrary websites.';
  }

  getHints() {
    return [
      'Prefer robust selectors: [name], [aria-label], stable IDs, form-relative selectors.',
      'Before mutation actions, run page.query_elements and page.highlight for target validation.',
      'For dynamic pages, capture a fresh snapshot after each major action.'
    ];
  }

  getSelectorPresets() {
    return {
      primaryInput: 'input[type="text"], input:not([type]), textarea',
      primarySubmit: 'button[type="submit"], input[type="submit"], button',
      navigationLinks: 'nav a, header a, a[href]'
    };
  }

  getWorkflowPresets() {
    return [
      'discover -> page.get_snapshot -> page.query_elements -> page.highlight',
      'form_fill -> page.query_elements -> page.type -> page.select -> page.click',
      'extract -> page.extract -> page.get_text -> page.get_html'
    ];
  }
}
