export async function openUrl(args = {}, ctx) {
  const active = await ctx.mustActiveTab();
  const url = String(args.url || '').trim();
  if (!url) return { ok: false, error: 'url is required' };
  const parsed = /^https?:\/\//i.test(url) ? url : `https://${url}`;

  if (args.newTab === false) {
    if (!active.id) throw new Error('Active tab has no id');
    await ctx.chrome.tabs.update(active.id, { url: parsed, active: true });
    return { ok: true, reusedActiveTab: true, url: parsed };
  }

  const tab = await ctx.chrome.tabs.create({ url: parsed, active: true });
  return { ok: true, newTabId: tab.id, url: parsed };
}
