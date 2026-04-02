import { TOOL_DEFS } from './tool-definitions.js';
import {
  browserTool,
  callPageTool,
  ensureContentScript,
  getActiveTab,
  waitForTabLoad
} from './tab-api.js';
import { buildInitialMessages, buildSystemPrompt } from './prompt-builder.js';
import { enforceToolPolicies, resolvePolicies } from './policy-guard.js';
import { safeJsonParse, truncateString } from './shared-utils.js';
import { executeWithStrategy } from './tool-executor.js';
import { createProvider } from '../providers/registry.js';
import { resolveStrategy, strategyContext } from '../strategies/registry.js';

function hostFromUrl(rawUrl) {
  try {
    return new URL(rawUrl).host.toLowerCase();
  } catch {
    return '';
  }
}

function previewArgs(args) {
  const json = safeJsonParse(JSON.stringify(args), {});
  return truncateString(JSON.stringify(json), 260);
}

export async function runAgent({ goal, settings, tabId, requestApproval, onEvent }) {
  const activeTab = tabId ? { id: tabId } : await getActiveTab();
  if (!activeTab?.id) throw new Error('No active tab available');
  let workingTabId = activeTab.id;

  await ensureContentScript(workingTabId);

  const provider = createProvider(settings);
  const initialSnapshot = await callPageTool(workingTabId, 'page.get_snapshot', {
    profile: 'fast'
  });
  const snapshot = initialSnapshot?.snapshot || {};

  const strategy = resolveStrategy(snapshot.url || '');
  const siteStrategyCtx = strategyContext(strategy, { goal, snapshot });
  const policies = resolvePolicies(settings);
  const siteHost = hostFromUrl(snapshot.url || '');
  onEvent?.({
    phase: 'start',
    tabId: workingTabId,
    strategy: siteStrategyCtx.name,
    siteHost
  });

  const messages = buildInitialMessages({
    goal,
    mutationPolicy: policies.mutationPolicy,
    highRiskPolicy: policies.highRiskPolicy,
    siteStrategyCtx,
    snapshot,
    settings
  });
  const trace = [];
  const toolEvents = [];

  if (provider.name === 'local_heuristic') {
    const local = await provider.complete({ goal, snapshot });
    onEvent?.({
      phase: 'complete',
      mode: 'local',
      answerPreview: truncateString(local.content || '(empty)', 160)
    });
    return {
      mode: 'local',
      answer: local.content || '(empty)',
      trace: ['Local heuristic provider used.'],
      toolEvents,
      strategy: siteStrategyCtx.name,
      policy: policies,
      siteHost,
      snapshotStats: snapshot.stats || {}
    };
  }

  let finalText = '';
  const maxTurns = Math.max(1, Math.min(12, Number(settings.maxTurns) || 8));

  for (let turn = 0; turn < maxTurns; turn += 1) {
    onEvent?.({ phase: 'turn', turn });
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

    if (assistant.content) {
      onEvent?.({
        phase: 'assistant_draft',
        turn,
        contentPreview: truncateString(assistant.content, 420)
      });
    }

    if (!toolCalls.length) {
      finalText = assistant.content || 'Done.';
      break;
    }

    for (const call of toolCalls) {
      const toolName = call?.function?.name;
      if (!toolName) continue;

      const rawArgs = safeJsonParse(call?.function?.arguments, {});
      let strategyArgs = strategy.enhanceToolArgs(toolName, rawArgs, { goal, snapshot });
      onEvent?.({
        phase: 'tool_start',
        turn,
        toolName,
        argsPreview: previewArgs(strategyArgs)
      });

      const guard = await enforceToolPolicies({
        toolName,
        args: strategyArgs,
        turn,
        strategyName: siteStrategyCtx.name,
        policies,
        requestApproval,
        siteHost,
        settings
      });

      if (guard.blocked) {
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(guard.result)
        });
        trace.push(guard.trace || `Blocked: ${toolName}`);
        toolEvents.push({
          turn,
          toolName,
          status: 'blocked',
          strategy: siteStrategyCtx.name,
          siteHost,
          argsPreview: previewArgs(strategyArgs),
          reason: guard.result?.reason || 'blocked'
        });
        onEvent?.({
          phase: 'tool_blocked',
          turn,
          toolName,
          reason: guard.result?.reason || 'blocked'
        });
        continue;
      }

      strategyArgs = guard.finalArgs;

      try {
        const start = Date.now();
        const result = await executeWithStrategy({
          toolName,
          args: strategyArgs,
          tabId: workingTabId,
          strategy,
          goal,
          snapshot,
          settings,
          deps: { browserTool, callPageTool, ensureContentScript, waitForTabLoad }
        });
        const elapsedMs = Date.now() - start;
        if (Number(result?.activeTabId)) {
          workingTabId = Number(result.activeTabId);
        }

        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result)
        });
        trace.push(`Executed: ${toolName}`);
        toolEvents.push({
          turn,
          toolName,
          status: result?.ok === false ? 'error' : 'ok',
          strategy: siteStrategyCtx.name,
          siteHost,
          elapsedMs,
          argsPreview: previewArgs(strategyArgs),
          reason: guard.bypassReason || 'executed'
        });
        onEvent?.({
          phase: 'tool_done',
          turn,
          toolName,
          elapsedMs,
          status: result?.ok === false ? 'error' : 'ok'
        });
      } catch (error) {
        const toolErr = { ok: false, error: String(error), toolName };
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(toolErr)
        });
        trace.push(`Error: ${toolName} -> ${String(error)}`);
        toolEvents.push({
          turn,
          toolName,
          status: 'error',
          strategy: siteStrategyCtx.name,
          siteHost,
          argsPreview: previewArgs(strategyArgs),
          reason: String(error)
        });
        onEvent?.({
          phase: 'tool_error',
          turn,
          toolName,
          error: String(error)
        });
      }
    }
  }

  if (!finalText) finalText = 'Agent reached max turns. Refine goal or raise maxTurns.';

  onEvent?.({
    phase: 'complete',
    mode: 'cloud',
    answerPreview: truncateString(finalText, 160)
  });
  return {
    mode: 'cloud',
    answer: finalText,
    trace,
    toolEvents,
    strategy: siteStrategyCtx.name,
    policy: policies,
    siteHost,
    snapshotStats: snapshot.stats || {}
  };
}
