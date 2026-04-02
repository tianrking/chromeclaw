export async function switchTab(args = {}, ctx) {
  const tabId = Number(args.tabId);
  if (!tabId) return { ok: false, error: 'tabId is required' };
  await ctx.chrome.tabs.update(tabId, { active: true });
  return { ok: true, tabId };
}
