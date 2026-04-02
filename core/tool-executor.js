import { MUTATION_TOOLS, NAVIGATION_TOOLS } from './constants.js';
import { trimLargePayload } from './shared-utils.js';

export async function executeToolNamespace(tabId, toolName, args, deps) {
  if (toolName.startsWith('page.')) {
    try {
      return await deps.callPageTool(tabId, toolName, args);
    } catch (error) {
      await deps.ensureContentScript(tabId);
      const retried = await deps.callPageTool(tabId, toolName, args);
      return { ...retried, recoveredAfterReinject: true, firstError: String(error) };
    }
  }

  if (toolName.startsWith('browser.')) {
    const browserResult = await deps.browserTool(toolName, args);
    if (!browserResult || typeof browserResult !== 'object') return browserResult;

    if (toolName === 'browser.open_url') {
      return {
        ...browserResult,
        activeTabId: Number(browserResult.newTabId) || Number(browserResult.tabId) || null
      };
    }
    if (toolName === 'browser.switch_tab') {
      return { ...browserResult, activeTabId: Number(browserResult.tabId) || null };
    }
    if (
      toolName === 'browser.navigate_back' ||
      toolName === 'browser.navigate_forward' ||
      toolName === 'browser.reload_tab'
    ) {
      return { ...browserResult, activeTabId: Number(browserResult.tabId) || null };
    }
    return browserResult;
  }

  return { ok: false, error: `Unknown tool namespace: ${toolName}` };
}

export async function executeWithStrategy({
  toolName,
  args,
  tabId,
  strategy,
  goal,
  snapshot,
  settings,
  deps
}) {
  let workingTabId = tabId;
  let result = await executeToolNamespace(workingTabId, toolName, args, deps);

  const nextTabId = Number(result?.activeTabId);
  if (nextTabId) {
    workingTabId = nextTabId;
  }

  if (NAVIGATION_TOOLS.has(toolName) && workingTabId) {
    await deps.waitForTabLoad(workingTabId, 5000);
    await deps.ensureContentScript(workingTabId);
    result = { ...result, autoRecoveredAfterNavigation: true, activeTabId: workingTabId };
  }

  if (MUTATION_TOOLS.has(toolName) && result?.ok === false) {
    const fallbackArgs = strategy.fallbackToolArgs(toolName, args, result, { goal, snapshot });
    if (fallbackArgs && JSON.stringify(fallbackArgs) !== JSON.stringify(args)) {
      const retryResult = await executeToolNamespace(workingTabId, toolName, fallbackArgs, deps);
      result = {
        ...retryResult,
        strategyRetried: true,
        firstError: result?.error || null
      };
    }
  }

  return {
    ...trimLargePayload(result, settings.maxSnapshotChars),
    activeTabId: workingTabId
  };
}
