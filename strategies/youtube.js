import { SiteStrategy } from './base.js';

export class YouTubeStrategy extends SiteStrategy {
  constructor() {
    super('youtube');
  }

  matches(url) {
    try {
      const u = new URL(url);
      return /(^|\.)youtube\.com$/i.test(u.hostname) || /(^|\.)youtu\.be$/i.test(u.hostname);
    } catch {
      return false;
    }
  }

  describe() {
    return 'YouTube strategy (search/player/settings focused).';
  }

  getHints() {
    return [
      'Search input often uses input#search or input[name="search_query"].',
      'Primary video links are commonly under a#video-title.',
      'Player controls are dynamic; refresh snapshot after clicks.'
    ];
  }

  getSelectorPresets() {
    return {
      searchInput: 'input#search, input[name="search_query"]',
      videoLinks: 'a#video-title, ytd-video-renderer a[href]',
      ccButton: '.ytp-subtitles-button'
    };
  }

  getWorkflowPresets() {
    return [
      'find_video -> page.type(searchInput) -> page.type(pressEnter=true) -> page.click(videoLinks)',
      'inspect_player -> page.get_snapshot -> page.query_elements(.html5-video-player,.ytp-right-controls)'
    ];
  }

  enhanceToolArgs(toolName, args) {
    const out = { ...(args || {}) };
    if (toolName === 'page.type' && !out.selector && !out.elementId) {
      out.selector = 'input#search, input[name="search_query"]';
    }
    if (toolName === 'page.click' && out.text && !out.selector) {
      out.selector = 'a#video-title, ytd-video-renderer a[href]';
    }
    return out;
  }
}
