const MANAGED_DNR_TAG = 'farito-managed';
const MANAGED_DNR_KEY = 'farito.dnr.managed_rule_ids';

function toResourceTypes(items) {
  const allowed = new Set([
    'main_frame',
    'sub_frame',
    'stylesheet',
    'script',
    'image',
    'font',
    'object',
    'xmlhttprequest',
    'ping',
    'csp_report',
    'media',
    'websocket',
    'webtransport',
    'webbundle',
    'other'
  ]);
  if (!Array.isArray(items) || !items.length) return ['main_frame', 'sub_frame', 'script', 'xmlhttprequest'];
  return items.map((v) => String(v)).filter((v) => allowed.has(v));
}

function toModifyHeaders(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((it) => ({
      header: String(it?.header || ''),
      operation: String(it?.operation || 'set'),
      value: it?.value == null ? undefined : String(it.value)
    }))
    .filter((it) => it.header && ['append', 'set', 'remove'].includes(it.operation));
}

function buildRule(raw, idx) {
  const id = Number(raw?.id) || 10000 + idx;
  const priority = Math.max(1, Math.min(1000, Number(raw?.priority) || 1));
  const actionType = String(raw?.actionType || 'block');

  let action = { type: actionType };
  if (actionType === 'redirect') {
    action = {
      type: 'redirect',
      redirect: { url: String(raw?.redirectUrl || '') }
    };
  } else if (actionType === 'modifyHeaders') {
    action = {
      type: 'modifyHeaders',
      requestHeaders: toModifyHeaders(raw?.requestHeaders),
      responseHeaders: toModifyHeaders(raw?.responseHeaders)
    };
  } else if (!['block', 'allow', 'upgradeScheme', 'allowAllRequests'].includes(actionType)) {
    action = { type: 'block' };
  }

  const condition = {
    resourceTypes: toResourceTypes(raw?.resourceTypes)
  };
  if (raw?.urlFilter) condition.urlFilter = String(raw.urlFilter);
  if (raw?.regexFilter) condition.regexFilter = String(raw.regexFilter);
  if (Array.isArray(raw?.initiatorDomains) && raw.initiatorDomains.length) {
    condition.initiatorDomains = raw.initiatorDomains.map((d) => String(d));
  }

  return {
    id,
    priority,
    action,
    condition,
    _meta: {
      tag: MANAGED_DNR_TAG,
      note: raw?.note ? String(raw.note) : ''
    }
  };
}

async function getManagedRuleIds(chromeApi) {
  const result = await chromeApi.storage.local.get(MANAGED_DNR_KEY);
  return Array.isArray(result[MANAGED_DNR_KEY]) ? result[MANAGED_DNR_KEY] : [];
}

async function setManagedRuleIds(chromeApi, ids) {
  await chromeApi.storage.local.set({ [MANAGED_DNR_KEY]: ids });
}

export async function dnrSetRules(args = {}, ctx) {
  if (!Array.isArray(args.rules) || !args.rules.length) {
    return { ok: false, error: 'rules(array) is required' };
  }

  const built = args.rules.slice(0, 100).map((rule, idx) => buildRule(rule, idx + 1));
  const addRules = built.map(({ _meta, ...rule }) => rule);
  const removeRuleIds = await getManagedRuleIds(ctx.chrome);

  await ctx.chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules
  });

  const nextIds = addRules.map((r) => r.id);
  await setManagedRuleIds(ctx.chrome, nextIds);
  return { ok: true, count: addRules.length, ruleIds: nextIds };
}

export async function dnrClearRules(_args, ctx) {
  const removeRuleIds = await getManagedRuleIds(ctx.chrome);
  if (removeRuleIds.length) {
    await ctx.chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules: []
    });
  }
  await setManagedRuleIds(ctx.chrome, []);
  return { ok: true, removed: removeRuleIds.length };
}

export async function dnrListRules(_args, ctx) {
  const all = await ctx.chrome.declarativeNetRequest.getDynamicRules();
  const managedIds = await getManagedRuleIds(ctx.chrome);
  const managed = new Set(managedIds);
  return {
    ok: true,
    total: all.length,
    managedCount: all.filter((r) => managed.has(r.id)).length,
    rules: all
  };
}
