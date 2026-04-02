export async function watcherCreate(args = {}, ctx) {
  if (!ctx.watchers?.createWatcher) {
    return { ok: false, error: 'Watcher API unavailable' };
  }
  const watcher = await ctx.watchers.createWatcher(args);
  return { ok: true, watcher };
}

export async function watcherList(_args, ctx) {
  if (!ctx.watchers?.listWatchers) {
    return { ok: false, error: 'Watcher API unavailable' };
  }
  const items = await ctx.watchers.listWatchers();
  return { ok: true, items, count: items.length };
}

export async function watcherPause(args = {}, ctx) {
  if (!ctx.watchers?.pauseWatcher) {
    return { ok: false, error: 'Watcher API unavailable' };
  }
  const id = String(args.id || '').trim();
  if (!id) return { ok: false, error: 'id is required' };
  const watcher = await ctx.watchers.pauseWatcher(id);
  if (!watcher) return { ok: false, error: `Watcher not found: ${id}` };
  return { ok: true, watcher };
}

export async function watcherResume(args = {}, ctx) {
  if (!ctx.watchers?.resumeWatcher) {
    return { ok: false, error: 'Watcher API unavailable' };
  }
  const id = String(args.id || '').trim();
  if (!id) return { ok: false, error: 'id is required' };
  const watcher = await ctx.watchers.resumeWatcher(id);
  if (!watcher) return { ok: false, error: `Watcher not found: ${id}` };
  return { ok: true, watcher };
}

export async function watcherRemove(args = {}, ctx) {
  if (!ctx.watchers?.removeWatcherById) {
    return { ok: false, error: 'Watcher API unavailable' };
  }
  const id = String(args.id || '').trim();
  if (!id) return { ok: false, error: 'id is required' };
  const removed = await ctx.watchers.removeWatcherById(id);
  return { ok: Boolean(removed), removed: Boolean(removed), id };
}
