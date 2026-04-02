(() => {
  async function run(toolName, args = {}) {
    if (!window.FaritoPageToolRegistry) {
      return { ok: false, error: 'Page tool registry not ready' };
    }
    return window.FaritoPageToolRegistry.run(toolName, args);
  }

  window.FaritoPageTools = { run };
})();
