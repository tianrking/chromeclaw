import { trimLargePayload } from './shared-utils.js';

export function buildSystemPrompt(settings, siteStrategyCtx) {
  const base = [
    'You are Farito, a practical browser agent extension.',
    'Use tools to inspect the page before acting.',
    'Prefer deterministic actions with clear selectors.',
    'Do not perform destructive actions unless explicitly asked.',
    'When uncertain, query elements and highlight before click/type.'
  ];

  if (siteStrategyCtx) {
    const selectorPresetText = JSON.stringify(siteStrategyCtx.selectorPresets || {});
    base.push(
      `Site strategy: ${siteStrategyCtx.name}`,
      `Strategy description: ${siteStrategyCtx.description}`,
      'Strategy hints:',
      ...(siteStrategyCtx.hints || []).map((h) => `- ${h}`),
      `Selector presets JSON: ${selectorPresetText}`,
      'Workflow presets:',
      ...(siteStrategyCtx.workflowPresets || []).map((w) => `- ${w}`)
    );
  }

  if (settings?.responseFormat === 'coding_plan') {
    base.push(
      'Use coding-plan style response sections in Markdown:',
      '1. Goal',
      '2. Constraints',
      '3. Plan',
      '4. Actions Taken',
      '5. Verification',
      '6. Final Output'
    );
  }

  return base.join('\n');
}

export function buildInitialMessages({ goal, mutationPolicy, highRiskPolicy, siteStrategyCtx, snapshot, settings }) {
  const compactSnapshot = trimLargePayload(snapshot || {}, settings.maxSnapshotChars);
  return [
    { role: 'system', content: buildSystemPrompt(settings, siteStrategyCtx) },
    {
      role: 'user',
      content: [
        `User goal: ${goal}`,
        `Mutation policy: ${mutationPolicy}`,
        `High-risk policy: ${highRiskPolicy}`,
        `Resolved site strategy: ${siteStrategyCtx.name}`,
        'Current page snapshot JSON:',
        JSON.stringify(compactSnapshot)
      ].join('\n\n')
    }
  ];
}
