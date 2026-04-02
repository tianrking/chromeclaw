function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

export async function evaluateWatcherCondition(watcher, context) {
  const condition = watcher?.condition || {};
  const type = String(condition.type || 'interval');

  if (type === 'interval') {
    return {
      matched: true,
      reason: 'interval_tick',
      statePatch: { lastTickAt: new Date().toISOString() }
    };
  }

  if (!context?.tabId) {
    return { matched: false, reason: 'no_tab' };
  }

  if (type === 'url_change') {
    const currentUrl = String(context.tab?.url || '');
    const prevUrl = String(watcher.state?.lastUrl || '');
    const expectedContains = String(condition.contains || '').trim();
    const changed = prevUrl && prevUrl !== currentUrl;
    const containsOk = expectedContains ? currentUrl.includes(expectedContains) : true;
    return {
      matched: Boolean(changed && containsOk),
      reason: changed ? 'url_changed' : 'url_same',
      statePatch: { lastUrl: currentUrl }
    };
  }

  if (!context.ensureContentScript || !context.callPageTool) {
    return { matched: false, reason: 'missing_page_deps' };
  }

  await context.ensureContentScript(context.tabId);

  if (type === 'element_state') {
    const selector = String(condition.selector || '').trim();
    if (!selector) return { matched: false, reason: 'selector_required' };
    const expected = String(condition.expected || 'exists').toLowerCase();
    const query = await context.callPageTool(context.tabId, 'page.query_elements', {
      selector,
      limit: 1
    });
    const exists = Array.isArray(query?.matches) && query.matches.length > 0;
    const matched = expected === 'not_exists' ? !exists : exists;
    return {
      matched,
      reason: matched ? 'element_state_matched' : 'element_state_unmatched',
      statePatch: { lastElementExists: exists }
    };
  }

  if (type === 'text_change') {
    const selector = String(condition.selector || '').trim();
    if (!selector) return { matched: false, reason: 'selector_required' };
    const item = await context.callPageTool(context.tabId, 'page.extract', {
      selector,
      attr: 'text',
      limit: 1
    });
    const currentText = normalizeText(item?.items?.[0]?.value || '');
    const prevText = normalizeText(watcher.state?.lastText || '');
    const contains = normalizeText(condition.contains || '');
    const changed = prevText && prevText !== currentText;
    const containsOk = contains ? currentText.includes(contains) : true;
    return {
      matched: Boolean(changed && containsOk),
      reason: changed ? 'text_changed' : 'text_same',
      statePatch: { lastText: currentText }
    };
  }

  return { matched: false, reason: `unsupported_condition:${type}` };
}
