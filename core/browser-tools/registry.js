import { captureVisible } from './capture-visible.js';
import { closeTab } from './close-tab.js';
import { deleteCookie, getCookies, setCookie } from './cookie-tools.js';
import { dnrClearRules, dnrListRules, dnrSetRules } from './dnr-tools.js';
import { cancelDownload, downloadBatch, downloadFile, getDownloadStatus } from './download-tools.js';
import { getTabContext } from './get-tab-context.js';
import { httpHistoryClear, httpHistoryGet, httpHistoryList, httpRequest } from './http-request.js';
import { listTabs } from './list-tabs.js';
import { navigateBack } from './navigate-back.js';
import { navigateForward } from './navigate-forward.js';
import { openUrl } from './open-url.js';
import { reloadTab } from './reload-tab.js';
import { switchTab } from './switch-tab.js';

const registry = {
  'browser.get_tab_context': getTabContext,
  'browser.list_tabs': listTabs,
  'browser.capture_visible': captureVisible,
  'browser.open_url': openUrl,
  'browser.switch_tab': switchTab,
  'browser.reload_tab': reloadTab,
  'browser.navigate_back': navigateBack,
  'browser.navigate_forward': navigateForward,
  'browser.close_tab': closeTab,
  'browser.http_request': httpRequest,
  'browser.http_history_list': httpHistoryList,
  'browser.http_history_get': httpHistoryGet,
  'browser.http_history_clear': httpHistoryClear,
  'browser.download': downloadFile,
  'browser.download_batch': downloadBatch,
  'browser.download_status': getDownloadStatus,
  'browser.download_cancel': cancelDownload,
  'browser.get_cookies': getCookies,
  'browser.set_cookie': setCookie,
  'browser.delete_cookie': deleteCookie,
  'browser.dnr_set_rules': dnrSetRules,
  'browser.dnr_list_rules': dnrListRules,
  'browser.dnr_clear_rules': dnrClearRules
};

export async function runBrowserTool(toolName, args = {}, ctx) {
  const handler = registry[toolName];
  if (!handler) return { ok: false, error: `Unknown browser tool: ${toolName}` };
  return handler(args, ctx);
}
