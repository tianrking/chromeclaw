(() => {
  const D = window.ChromeClawDom;
  const HIGHLIGHT_ID = 'chromeclaw-highlight-box';

  function truncate(str, maxChars = 120000) {
    const raw = String(str || '');
    if (raw.length <= maxChars) return raw;
    return `${raw.slice(0, maxChars)}\n\n[TRUNCATED ${raw.length - maxChars} chars]`;
  }

  function clamp(value, min, max, fallback) {
    const num = Number(value);
    if (Number.isNaN(num)) return fallback;
    return Math.max(min, Math.min(max, num));
  }

  window.ChromeClawToolShared = { D, HIGHLIGHT_ID, truncate, clamp };
})();
