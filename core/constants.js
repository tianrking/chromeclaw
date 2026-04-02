export const SETTINGS_KEY = 'farito.settings';

export const DEFAULT_SETTINGS = {
  providerKind: 'openai_compatible',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4.1-mini',
  responseFormat: 'default',
  reasoningEffort: 'off',
  temperature: 0.2,
  maxTurns: 8,
  mutationPolicy: 'auto',
  highRiskPolicy: 'confirm',
  autoExecute: true,
  maxSnapshotChars: 180000,
  siteAutoAllow: {}
};

export const NAVIGATION_TOOLS = new Set([
  'browser.open_url',
  'browser.navigate_back',
  'browser.navigate_forward',
  'browser.reload_tab'
]);

export const MUTATION_TOOLS = new Set([
  'page.click',
  'page.keypress',
  'page.type',
  'page.select',
  'page.check',
  'page.uncheck',
  'page.scroll',
  'browser.open_url',
  'browser.navigate_back',
  'browser.navigate_forward',
  'browser.close_tab',
  'browser.switch_tab',
  'browser.reload_tab',
  'browser.download',
  'browser.download_batch',
  'browser.download_cancel',
  'browser.set_cookie',
  'browser.delete_cookie',
  'browser.dnr_set_rules',
  'browser.dnr_clear_rules',
  'browser.watcher_create',
  'browser.watcher_pause',
  'browser.watcher_resume',
  'browser.watcher_remove'
]);

export const HIGH_RISK_TOOLS = new Set([
  'page.eval_js',
  'page.run_scriptlet',
  'page.tap_websocket',
  'browser.http_request',
  'browser.get_cookies',
  'browser.set_cookie',
  'browser.delete_cookie',
  'browser.dnr_set_rules',
  'browser.dnr_clear_rules',
  'browser.open_url',
  'browser.close_tab',
  'browser.watcher_create',
  'browser.watcher_remove'
]);
