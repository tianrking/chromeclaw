export async function reloadTab(args = {}, ctx) {
  const active = await ctx.mustActiveTab();
  const tabId = Number(args.tabId) || active.id;
  if (!tabId) return { ok: false, error: 'No target tab id' };
  await ctx.chrome.tabs.reload(tabId, { bypassCache: Boolean(args.bypassCache) });
  return { ok: true, tabId, bypassCache: Boolean(args.bypassCache) };
}
