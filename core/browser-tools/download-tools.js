function normalizeItem(item) {
  const url = String(item?.url || '').trim();
  if (!/^https?:\/\//i.test(url)) return null;
  return {
    url,
    filename: item?.filename ? String(item.filename) : undefined
  };
}

export async function downloadFile(args = {}, ctx) {
  const item = normalizeItem(args);
  if (!item) return { ok: false, error: 'Valid http(s) url is required' };
  const downloadId = await ctx.chrome.downloads.download({
    url: item.url,
    filename: item.filename,
    saveAs: Boolean(args.saveAs),
    conflictAction: args.conflictAction ? String(args.conflictAction) : undefined
  });
  return { ok: true, downloadId, item };
}

export async function downloadBatch(args = {}, ctx) {
  if (!Array.isArray(args.items) || !args.items.length) {
    return { ok: false, error: 'items(array) is required' };
  }

  const out = [];
  for (const raw of args.items.slice(0, 80)) {
    const item = normalizeItem(raw);
    if (!item) {
      out.push({ ok: false, error: 'invalid url', raw });
      continue;
    }
    try {
      const downloadId = await ctx.chrome.downloads.download({
        url: item.url,
        filename: item.filename,
        saveAs: Boolean(args.saveAs)
      });
      out.push({ ok: true, downloadId, item });
    } catch (error) {
      out.push({ ok: false, error: String(error), item });
    }
  }

  return {
    ok: true,
    requested: out.length,
    success: out.filter((it) => it.ok).length,
    items: out
  };
}

export async function getDownloadStatus(args = {}, ctx) {
  const downloadId = Number(args.downloadId);
  if (!downloadId) return { ok: false, error: 'downloadId is required' };
  const list = await ctx.chrome.downloads.search({ id: downloadId });
  return { ok: true, item: list?.[0] || null };
}

export async function cancelDownload(args = {}, ctx) {
  const downloadId = Number(args.downloadId);
  if (!downloadId) return { ok: false, error: 'downloadId is required' };
  await ctx.chrome.downloads.cancel(downloadId);
  return { ok: true, downloadId };
}
