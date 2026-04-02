const goalEl = document.getElementById('goal');
const runBtn = document.getElementById('run');
const resultEl = document.getElementById('result');
const traceEl = document.getElementById('trace');
const statusEl = document.getElementById('status');
const openOptionsBtn = document.getElementById('openOptions');
const approvalsEl = document.getElementById('approvals');
const chatFeedEl = document.getElementById('chatFeed');
const stateModeEl = document.getElementById('stateMode');
const stateStrategyEl = document.getElementById('stateStrategy');
const stateApprovalEl = document.getElementById('stateApproval');
const stateTaskEl = document.getElementById('stateTask');

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function truncateText(text, max = 140) {
  const raw = String(text || '');
  return raw.length > max ? `${raw.slice(0, max - 1)}…` : raw;
}

function nowLabel() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function resolveStrategyByHost(host) {
  const h = String(host || '').toLowerCase();
  if (h.includes('youtube.com')) return 'youtube';
  if (h.includes('github.com')) return 'github';
  if (h.includes('google.com')) return 'google';
  return 'generic';
}

function approvalModeLabel(settings) {
  const mutation = settings?.mutationPolicy || 'auto';
  const high = settings?.highRiskPolicy || 'confirm';
  return `M:${mutation} / H:${high}`;
}

function updateGlobalState(partial = {}) {
  if (partial.mode && stateModeEl) stateModeEl.textContent = partial.mode;
  if (partial.strategy && stateStrategyEl) stateStrategyEl.textContent = partial.strategy;
  if (partial.approval && stateApprovalEl) stateApprovalEl.textContent = partial.approval;
  if (partial.task && stateTaskEl) stateTaskEl.textContent = truncateText(partial.task, 42);
}

function scrollChatToBottom() {
  if (!chatFeedEl) return;
  chatFeedEl.scrollTop = chatFeedEl.scrollHeight;
}

function createMessageNode({ role, title, text, typing = false }) {
  const wrap = document.createElement('article');
  wrap.className = `msg msg-${role}${typing ? ' is-typing' : ''}`;

  const meta = document.createElement('div');
  meta.className = 'msg-meta';
  meta.textContent = `${title} · ${nowLabel()}`;

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';

  if (typing) {
    const dots = document.createElement('span');
    dots.className = 'typing-dots';
    dots.innerHTML = '<i></i><i></i><i></i>';
    const label = document.createElement('span');
    label.className = 'typing-label';
    label.textContent = text || 'Executing plan';
    bubble.append(label, dots);
  } else {
    bubble.textContent = text || '(empty)';
  }

  wrap.append(meta, bubble);
  return { wrap, bubble };
}

function appendMessage({ role, title, text, typing = false }) {
  if (!chatFeedEl) return null;
  const node = createMessageNode({ role, title, text, typing });
  chatFeedEl.appendChild(node.wrap);
  scrollChatToBottom();
  return node.wrap;
}

function normalizeStatus(status) {
  if (status === 'ok') return 'ok';
  if (status === 'blocked') return 'blocked';
  return 'error';
}

function renderToolCards(container, events = []) {
  if (!Array.isArray(events) || !events.length) return;

  const list = document.createElement('div');
  list.className = 'tool-card-list';

  for (const event of events) {
    const details = document.createElement('details');
    details.className = `tool-card tool-${normalizeStatus(event.status)}`;

    const summary = document.createElement('summary');
    summary.innerHTML = `
      <span class="tool-badge">${normalizeStatus(event.status).toUpperCase()}</span>
      <span class="tool-name">${event.toolName}</span>
      <span class="tool-meta">turn ${event.turn ?? '-'}${event.elapsedMs ? ` · ${event.elapsedMs}ms` : ''}</span>
    `;

    const content = document.createElement('div');
    content.className = 'tool-card-body';

    const strategy = document.createElement('div');
    strategy.className = 'tool-row';
    strategy.textContent = `strategy=${event.strategy || 'generic'} · host=${event.siteHost || '-'}`;

    const reason = document.createElement('div');
    reason.className = 'tool-row';
    reason.textContent = `reason=${truncateText(event.reason || '-', 120)}`;

    const args = document.createElement('pre');
    args.className = 'tool-args';
    args.textContent = event.argsPreview || '{}';

    content.append(strategy, reason, args);
    details.append(summary, content);
    list.appendChild(details);
  }

  container.appendChild(list);
}

function extractTargetPreview(item) {
  const args = item?.args || {};
  if (args.selector) return `selector: ${truncateText(args.selector, 88)}`;
  if (args.url) return `url: ${truncateText(args.url, 88)}`;
  if (args.xpath) return `xpath: ${truncateText(args.xpath, 88)}`;
  if (args.text) return `text: ${truncateText(args.text, 88)}`;
  return 'No direct target selector';
}

function impactScope(toolName) {
  const tool = String(toolName || '');
  if (tool.startsWith('page.')) return 'Current page DOM';
  if (tool.includes('cookie')) return 'Browser session cookies';
  if (tool.includes('dnr')) return 'Request rules and filtering';
  if (tool.includes('download')) return 'Local download workflow';
  if (tool.startsWith('browser.')) return 'Browser tab/session state';
  return 'Unknown scope';
}

async function getActiveTabContext() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs?.[0];
  const tabId = tab?.id;
  let host = '';
  try {
    host = tab?.url ? new URL(tab.url).host.toLowerCase() : '';
  } catch {
    host = '';
  }
  return { tabId, host };
}

async function allowToolForSite({ host, toolName }) {
  if (!host || !toolName) return;
  await chrome.runtime.sendMessage({
    type: 'chromeclaw.allow_tool_for_site',
    host,
    toolName
  });
}

async function runAgent() {
  const goal = goalEl?.value.trim() || '';
  if (!goal) {
    setStatus('Please enter a goal.');
    return;
  }

  appendMessage({ role: 'user', title: 'You', text: goal });

  const { tabId } = await getActiveTabContext();
  if (!tabId) {
    setStatus('No active tab found.');
    appendMessage({ role: 'system', title: 'System', text: 'No active tab found.' });
    return;
  }

  setStatus('Running...');
  updateGlobalState({ task: `Running: ${goal}` });
  if (resultEl) resultEl.textContent = '';
  if (traceEl) traceEl.textContent = '';
  runBtn.disabled = true;

  const typingMsg = appendMessage({
    role: 'assistant',
    title: 'ChromeClaw',
    text: 'Executing plan',
    typing: true
  });

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'chromeclaw.run_agent',
      tabId,
      goal
    });

    if (!response?.ok) {
      throw new Error(response?.error || 'Agent failed');
    }

    const result = response.result || {};
    const answer = result.answer || '(empty)';
    if (resultEl) resultEl.textContent = answer;
    if (traceEl) traceEl.textContent = (result.trace || []).join('\n') || '(none)';

    if (typingMsg?.parentNode) typingMsg.remove();
    const doneMsg = appendMessage({ role: 'assistant', title: 'ChromeClaw', text: answer });
    if (doneMsg) renderToolCards(doneMsg, result.toolEvents || []);

    updateGlobalState({
      mode: result.mode || 'cloud',
      strategy: result.strategy || 'generic',
      task: `Completed: ${goal}`,
      approval: result.policy
        ? `M:${result.policy.mutationPolicy} / H:${result.policy.highRiskPolicy}`
        : undefined
    });
    setStatus(`Done (${result.mode || 'unknown'} mode)`);
  } catch (err) {
    const msg = String(err);
    if (resultEl) resultEl.textContent = msg;
    if (typingMsg?.parentNode) typingMsg.remove();
    appendMessage({ role: 'system', title: 'Error', text: msg });
    updateGlobalState({ task: `Failed: ${goal}` });
    setStatus('Error');
  } finally {
    runBtn.disabled = false;
  }
}

async function loadApprovals() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'chromeclaw.approval_list' });
    if (!response?.ok) return;
    renderApprovals(response.items || []);
  } catch {
    // ignore
  }
}

async function decideApproval(id, approved) {
  await chrome.runtime.sendMessage({
    type: 'chromeclaw.approval_decide',
    id,
    approved
  });
  await loadApprovals();
}

function renderApprovals(items) {
  if (!approvalsEl) return;
  approvalsEl.innerHTML = '';
  if (!items.length) {
    approvalsEl.textContent = 'No pending actions.';
    return;
  }

  for (const item of items) {
    const wrap = document.createElement('article');
    wrap.className = 'approval-card';

    const top = document.createElement('div');
    top.className = 'approval-top';

    const title = document.createElement('div');
    title.className = 'approval-tool';
    title.textContent = item.toolName;

    const badge = document.createElement('span');
    badge.className = `risk-badge risk-${item.riskLevel || 'normal'}`;
    badge.textContent = (item.riskLevel || 'normal').toUpperCase();

    top.append(title, badge);

    const meta = document.createElement('div');
    meta.className = 'approval-meta';
    meta.textContent = `strategy=${item.strategy || 'generic'} · host=${item.siteHost || '-'} · turn=${item.turn ?? '-'}`;

    const target = document.createElement('div');
    target.className = 'approval-target';
    target.textContent = `Target: ${extractTargetPreview(item)}`;

    const scope = document.createElement('div');
    scope.className = 'approval-scope';
    scope.textContent = `Impact: ${impactScope(item.toolName)}`;

    const argsWrap = document.createElement('details');
    argsWrap.className = 'approval-details';
    const argsSummary = document.createElement('summary');
    argsSummary.textContent = 'View arguments';
    const args = document.createElement('pre');
    args.className = 'approval-args';
    args.textContent = JSON.stringify(item.args || {}, null, 2);
    argsWrap.append(argsSummary, args);

    const actions = document.createElement('div');
    actions.className = 'approval-actions';

    const approve = document.createElement('button');
    approve.className = 'btn-approve';
    approve.textContent = 'Approve';
    approve.addEventListener('click', () => decideApproval(item.id, true));

    const reject = document.createElement('button');
    reject.className = 'btn-reject';
    reject.textContent = 'Reject';
    reject.addEventListener('click', () => decideApproval(item.id, false));

    const allow = document.createElement('button');
    allow.className = 'ghost';
    allow.textContent = 'Always allow on this site';
    allow.disabled = !item.siteHost;
    allow.addEventListener('click', async () => {
      await allowToolForSite({ host: item.siteHost, toolName: item.toolName });
      appendMessage({
        role: 'system',
        title: 'Policy',
        text: `Saved auto-allow rule: ${item.toolName} on ${item.siteHost}`
      });
      await decideApproval(item.id, true);
    });

    actions.append(approve, reject, allow);
    wrap.append(top, meta, target, scope, argsWrap, actions);
    approvalsEl.appendChild(wrap);
  }
}

async function bootstrapState() {
  try {
    const [{ settings }, { host }] = await Promise.all([
      chrome.runtime.sendMessage({ type: 'chromeclaw.get_settings' }),
      getActiveTabContext()
    ]);
    updateGlobalState({
      mode: settings?.providerKind || 'openai_compatible',
      strategy: resolveStrategyByHost(host),
      approval: approvalModeLabel(settings),
      task: 'Idle'
    });
  } catch {
    updateGlobalState({
      mode: 'unknown',
      strategy: 'generic',
      approval: '-',
      task: 'Idle'
    });
  }
}

if (runBtn) runBtn.addEventListener('click', runAgent);
if (goalEl) {
  goalEl.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      runAgent();
    }
  });
}
if (openOptionsBtn) openOptionsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'chromeclaw.approval_updated') loadApprovals();
});

if (chatFeedEl && !chatFeedEl.children.length) {
  appendMessage({
    role: 'system',
    title: 'System',
    text: 'Agent timeline ready. Run a task to see step cards and live status.'
  });
}

setInterval(loadApprovals, 1500);
loadApprovals();
bootstrapState();
