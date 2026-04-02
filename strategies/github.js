import { SiteStrategy } from './base.js';

export class GitHubStrategy extends SiteStrategy {
  constructor() {
    super('github');
  }

  matches(url) {
    try {
      const u = new URL(url);
      return /(^|\.)github\.com$/i.test(u.hostname);
    } catch {
      return false;
    }
  }

  describe() {
    return 'GitHub strategy (repo/issues/pr/code navigation focused).';
  }

  getHints() {
    return [
      'Repository search inputs often include input[name="q"].',
      'Primary tab navigation is usually under nav a[data-tab-item] or [role="tab"].',
      'Code entries are often in a.Link--primary, [data-testid] elements can be stable.'
    ];
  }

  getSelectorPresets() {
    return {
      searchInput: 'input[name="q"], input[aria-label*="Search"]',
      repoTabs: 'nav a[data-tab-item], nav[aria-label*="Repository"] a',
      codeLinks: 'a.Link--primary, [data-testid="tree-item-file-name"]'
    };
  }

  getWorkflowPresets() {
    return [
      'repo_scan -> page.get_snapshot -> page.extract(codeLinks)',
      'issue_triage -> page.query_elements(a[href*="/issues"]) -> page.click -> page.extract([data-testid])'
    ];
  }

  enhanceToolArgs(toolName, args) {
    const out = { ...(args || {}) };
    if (toolName === 'page.type' && !out.selector && !out.elementId) {
      out.selector = 'input[name="q"], input[aria-label*="Search"]';
    }
    return out;
  }
}
