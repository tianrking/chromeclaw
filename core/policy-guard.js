import { HIGH_RISK_TOOLS, MUTATION_TOOLS } from './constants.js';

export function resolvePolicies(settings) {
  const mutationPolicy = settings?.mutationPolicy || (settings?.autoExecute === false ? 'block' : 'auto');
  const highRiskPolicy = settings?.highRiskPolicy || 'confirm';
  return { mutationPolicy, highRiskPolicy };
}

function normalizeHost(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim().toLowerCase();
}

function isToolAutoAllowedForSite({ toolName, siteHost, settings }) {
  const host = normalizeHost(siteHost);
  if (!host) return false;

  const rules = settings?.siteAutoAllow;
  if (!rules || typeof rules !== 'object') return false;

  const hostRules = rules[host];
  if (!Array.isArray(hostRules)) return false;
  return hostRules.includes(toolName);
}

export async function enforceToolPolicies({
  toolName,
  args,
  turn,
  strategyName,
  policies,
  requestApproval,
  siteHost,
  settings
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

  const autoAllowedBySite = isToolAutoAllowedForSite({ toolName, siteHost, settings });
  const needsApproveForMutation = isMutation && mutationPolicy === 'confirm' && !autoAllowedBySite;
  const needsApproveForRisk = isHighRisk && highRiskPolicy === 'confirm' && !autoAllowedBySite;
  if (!needsApproveForMutation && !needsApproveForRisk) {
    return {
      blocked: false,
      finalArgs: args,
      bypassReason: autoAllowedBySite ? 'site_auto_allow' : 'policy_auto'
    };
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
    riskLevel: isHighRisk ? 'high' : 'normal',
    siteHost
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
    finalArgs: approval?.patchedArgs && typeof approval.patchedArgs === 'object' ? approval.patchedArgs : args,
    bypassReason: 'user_approved'
  };
}
