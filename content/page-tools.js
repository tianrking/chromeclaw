(() => {
  async function run(toolName, args = {}) {
    if (!window.ChromeClawPageToolRegistry) {
      return { ok: false, error: 'Page tool registry not ready' };
    }
    return window.ChromeClawPageToolRegistry.run(toolName, args);
  }

  window.ChromeClawPageTools = { run };
})();
