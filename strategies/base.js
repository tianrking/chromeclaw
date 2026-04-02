export class SiteStrategy {
  constructor(name) {
    this.name = name;
  }

  matches(_url) {
    return false;
  }

  describe() {
    return '';
  }

  getHints(_context) {
    return [];
  }

  getSelectorPresets(_context) {
    return {};
  }

  getWorkflowPresets(_context) {
    return [];
  }

  enhanceToolArgs(_toolName, args, _context) {
    return args;
  }

  fallbackToolArgs(_toolName, _args, _result, _context) {
    return null;
  }
}
