import { MUTATION_TOOLS } from './constants.js';
import { trimLargePayload } from './shared-utils.js';

export async function executeToolNamespace(tabId, toolName, args, deps) {
  if (toolName.startsWith('page.')) return deps.callPageTool(tabId, toolName, args);
  if (toolName.startsWith('browser.')) return deps.browserTool(toolName, args);
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
  let result = await executeToolNamespace(tabId, toolName, args, deps);

  if (MUTATION_TOOLS.has(toolName) && result?.ok === false) {
    const fallbackArgs = strategy.fallbackToolArgs(toolName, args, result, { goal, snapshot });
    if (fallbackArgs && JSON.stringify(fallbackArgs) !== JSON.stringify(args)) {
      const retryResult = await executeToolNamespace(tabId, toolName, fallbackArgs, deps);
      result = {
        ...retryResult,
        strategyRetried: true,
        firstError: result?.error || null
      };
    }
  }

  return trimLargePayload(result, settings.maxSnapshotChars);
}
