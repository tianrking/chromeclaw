export async function captureVisible(args = {}, ctx) {
  const active = await ctx.mustActiveTab();
  const quality = Math.max(1, Math.min(100, Number(args.quality) || 70));
  const dataUrl = await ctx.chrome.tabs.captureVisibleTab(active.windowId, {
    format: 'jpeg',
    quality
  });

  return {
    ok: true,
    format: 'jpeg',
    quality,
    dataUrl,
    note: 'Data URL may be large.'
  };
}
