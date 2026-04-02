export async function listTabs(args = {}, ctx) {
  const tabs = await ctx.chrome.tabs.query({ currentWindow: args.currentWindowOnly !== false });
  const limit = Math.max(1, Math.min(200, Number(args.limit) || 40));
  return {
    ok: true,
    tabs: tabs.slice(0, limit).map((tab) => ({
      id: tab.id,
      index: tab.index,
      title: tab.title,
      url: tab.url,
      active: tab.active,
      pinned: tab.pinned,
      status: tab.status
    }))
  };
}
