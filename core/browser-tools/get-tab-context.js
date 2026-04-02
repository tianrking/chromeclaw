export async function getTabContext(_args, ctx) {
  const active = await ctx.mustActiveTab();
  return {
    ok: true,
    tab: {
      id: active.id,
      url: active.url,
      title: active.title,
      status: active.status,
      favIconUrl: active.favIconUrl,
      windowId: active.windowId,
      active: active.active,
      pinned: active.pinned,
      incognito: active.incognito
    }
  };
}
