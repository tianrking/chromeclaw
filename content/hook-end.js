(() => {
  const queue = (window.__faritoHookQueue = window.__faritoHookQueue || []);
  const item = { hook: 'document_end', ts: Date.now() };
  queue.push(item);
  window.dispatchEvent(new CustomEvent('farito:hook', { detail: item }));
})();
