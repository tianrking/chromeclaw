export async function navigateBack(_args, ctx) {
  const active = await ctx.mustActiveTab();
  if (!active.id) return { ok: false, error: 'No active tab id' };
  await ctx.chrome.tabs.goBack(active.id);
  return { ok: true, tabId: active.id };
}
