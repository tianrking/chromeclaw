(() => {
  const queue = (window.__chromeclawHookQueue = window.__chromeclawHookQueue || []);
  const item = { hook: 'document_start', ts: Date.now() };
  queue.push(item);
  window.dispatchEvent(new CustomEvent('chromeclaw:hook', { detail: item }));
})();
