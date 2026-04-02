import { HIGH_RISK_TOOLS, MUTATION_TOOLS } from './constants.js';

export function resolvePolicies(settings) {
  const mutationPolicy = settings?.mutationPolicy || (settings?.autoExecute === false ? 'block' : 'auto');
  const highRiskPolicy = settings?.highRiskPolicy || 'confirm';
  return { mutationPolicy, highRiskPolicy };
}

export async function enforceToolPolicies({
  toolName,
  args,
  turn,
  strategyName,
  policies,
  requestApproval
}) {
  const isMutation = MUTATION_TOOLS.has(toolName);
  const isHighRisk = HIGH_RISK_TOOLS.has(toolName);
  const { mutationPolicy, highRiskPolicy } = policies;

  if ((isMutation && mutationPolicy === 'block') || (isHighRisk && highRiskPolicy === 'block')) {
    return {
      blocked: true,
      result: {
        ok: false,
        blocked: true,
        reason: isHighRisk && highRiskPolicy === 'block' ? 'High-risk policy is block' : 'Mutation policy is block',
        toolName,
        args
      },
      trace: `Blocked by policy: ${toolName}`
    };
  }

  const needsApproveForMutation = isMutation && mutationPolicy === 'confirm';
  const needsApproveForRisk = isHighRisk && highRiskPolicy === 'confirm';
  if (!needsApproveForMutation && !needsApproveForRisk) {
    return { blocked: false, finalArgs: args };
  }

  if (typeof requestApproval !== 'function') {
    return {
      blocked: true,
      result: {
        ok: false,
        blocked: true,
        reason: 'Approval required but no approval handler is available',
        toolName,
        args
      },
      trace: `Blocked by policy: ${toolName}`
    };
  }

  const approval = await requestApproval({
    toolName,
    args,
    turn,
    strategy: strategyName,
    riskLevel: isHighRisk ? 'high' : 'normal'
  });

  if (!approval?.approved) {
    return {
      blocked: true,
      result: {
        ok: false,
        blocked: true,
        reason: approval?.reason || 'Rejected by user',
        toolName,
        args
      },
      trace: `Rejected by user: ${toolName}`
    };
  }

  return {
    blocked: false,
    finalArgs: approval?.patchedArgs && typeof approval.patchedArgs === 'object' ? approval.patchedArgs : args
  };
}
