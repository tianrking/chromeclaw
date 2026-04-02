export async function getCookies(args = {}, ctx) {
  const details = {};
  if (args.url) details.url = String(args.url);
  if (args.domain) details.domain = String(args.domain);
  if (args.name) details.name = String(args.name);
  if (args.storeId) details.storeId = String(args.storeId);
  const cookies = await ctx.chrome.cookies.getAll(details);
  return { ok: true, count: cookies.length, cookies };
}

export async function setCookie(args = {}, ctx) {
  const url = String(args.url || '').trim();
  const name = String(args.name || '').trim();
  if (!url || !/^https?:\/\//i.test(url)) return { ok: false, error: 'Valid url is required' };
  if (!name) return { ok: false, error: 'name is required' };

  const details = {
    url,
    name,
    value: args.value == null ? '' : String(args.value),
    domain: args.domain ? String(args.domain) : undefined,
    path: args.path ? String(args.path) : undefined,
    secure: args.secure == null ? undefined : Boolean(args.secure),
    httpOnly: args.httpOnly == null ? undefined : Boolean(args.httpOnly),
    sameSite: args.sameSite ? String(args.sameSite) : undefined,
    expirationDate: args.expirationDate == null ? undefined : Number(args.expirationDate),
    storeId: args.storeId ? String(args.storeId) : undefined
  };

  const cookie = await ctx.chrome.cookies.set(details);
  return { ok: true, cookie };
}

export async function deleteCookie(args = {}, ctx) {
  const url = String(args.url || '').trim();
  const name = String(args.name || '').trim();
  if (!url || !/^https?:\/\//i.test(url)) return { ok: false, error: 'Valid url is required' };
  if (!name) return { ok: false, error: 'name is required' };

  const removed = await ctx.chrome.cookies.remove({
    url,
    name,
    storeId: args.storeId ? String(args.storeId) : undefined
  });
  return { ok: true, removed };
}
