(() => {
  const handlers = new Map();

  function register(name, handler) {
    handlers.set(name, handler);
  }

  async function run(name, args) {
    const handler = handlers.get(name);
    if (!handler) return { ok: false, error: `Unknown page tool: ${name}` };
    return handler(args || {});
  }

  window.ChromeClawPageToolRegistry = { register, run };
})();
