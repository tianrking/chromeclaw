import { TOOL_DEFS } from './tool-definitions.js';
import { browserTool, callPageTool, ensureContentScript, getActiveTab } from './tab-api.js';
import { buildInitialMessages, buildSystemPrompt } from './prompt-builder.js';
import { enforceToolPolicies, resolvePolicies } from './policy-guard.js';
import { safeJsonParse } from './shared-utils.js';
import { executeWithStrategy } from './tool-executor.js';
import { createProvider } from '../providers/registry.js';
import { resolveStrategy, strategyContext } from '../strategies/registry.js';

export async function runAgent({ goal, settings, tabId, requestApproval }) {
  const activeTab = tabId ? { id: tabId } : await getActiveTab();
  if (!activeTab?.id) throw new Error('No active tab available');

  await ensureContentScript(activeTab.id);

  const provider = createProvider(settings);
  const initialSnapshot = await callPageTool(activeTab.id, 'page.get_snapshot', {});
  const snapshot = initialSnapshot?.snapshot || {};

  const strategy = resolveStrategy(snapshot.url || '');
  const siteStrategyCtx = strategyContext(strategy, { goal, snapshot });
  const policies = resolvePolicies(settings);

  const messages = buildInitialMessages({
    goal,
    mutationPolicy: policies.mutationPolicy,
    highRiskPolicy: policies.highRiskPolicy,
    siteStrategyCtx,
    snapshot,
    settings
  });
  const trace = [];

  if (provider.name === 'local_heuristic') {
    const local = await provider.complete({ goal, snapshot });
    return {
      mode: 'local',
      answer: local.content || '(empty)',
      trace: ['Local heuristic provider used.'],
      snapshotStats: snapshot.stats || {}
    };
  }

  let finalText = '';
  const maxTurns = Math.max(1, Math.min(12, Number(settings.maxTurns) || 8));

  for (let turn = 0; turn < maxTurns; turn += 1) {
    const assistant = await provider.complete({
      messages,
      tools: TOOL_DEFS,
      goal,
      snapshot,
      systemPrompt: buildSystemPrompt(settings, siteStrategyCtx)
    });

    const toolCalls = assistant.tool_calls || [];
    messages.push({
      role: 'assistant',
      content: assistant.content || '',
      tool_calls: toolCalls
    });

    if (!toolCalls.length) {
      finalText = assistant.content || 'Done.';
      break;
    }

    for (const call of toolCalls) {
      const toolName = call?.function?.name;
      if (!toolName) continue;

      const rawArgs = safeJsonParse(call?.function?.arguments, {});
      let strategyArgs = strategy.enhanceToolArgs(toolName, rawArgs, { goal, snapshot });

      const guard = await enforceToolPolicies({
        toolName,
        args: strategyArgs,
        turn,
        strategyName: siteStrategyCtx.name,
        policies,
        requestApproval
      });

      if (guard.blocked) {
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(guard.result)
        });
        trace.push(guard.trace || `Blocked: ${toolName}`);
        continue;
      }

      strategyArgs = guard.finalArgs;

      try {
        const result = await executeWithStrategy({
          toolName,
          args: strategyArgs,
          tabId: activeTab.id,
          strategy,
          goal,
          snapshot,
          settings,
          deps: { browserTool, callPageTool }
        });

        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result)
        });
        trace.push(`Executed: ${toolName}`);
      } catch (error) {
        const toolErr = { ok: false, error: String(error), toolName };
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(toolErr)
        });
        trace.push(`Error: ${toolName} -> ${String(error)}`);
      }
    }
  }

  if (!finalText) finalText = 'Agent reached max turns. Refine goal or raise maxTurns.';

  return {
    mode: 'cloud',
    answer: finalText,
    trace,
    snapshotStats: snapshot.stats || {}
  };
}
