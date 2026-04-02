export async function closeTab(args = {}, ctx) {
  const active = await ctx.mustActiveTab();
  const tabId = Number(args.tabId) || active.id;
  if (!tabId) return { ok: false, error: 'No target tab id' };
  await ctx.chrome.tabs.remove(tabId);
  return { ok: true, closedTabId: tabId };
}
