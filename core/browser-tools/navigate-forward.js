export async function navigateForward(_args, ctx) {
  const active = await ctx.mustActiveTab();
  if (!active.id) return { ok: false, error: 'No active tab id' };
  await ctx.chrome.tabs.goForward(active.id);
  return { ok: true, tabId: active.id };
}
