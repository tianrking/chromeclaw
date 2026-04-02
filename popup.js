const goalEl = document.getElementById('goal');
const runBtn = document.getElementById('run');
const resultEl = document.getElementById('result');
const traceEl = document.getElementById('trace');
const statusEl = document.getElementById('status');
const openOptionsBtn = document.getElementById('openOptions');
const autoApproveToggleBtn = document.getElementById('autoApproveToggle');
const newChatBtn = document.getElementById('newChat');
const sessionSelectEl = document.getElementById('sessionSelect');
const approvalsEl = document.getElementById('approvals');
const approvalsPanelEl = document.querySelector('.approvals-panel');
const chatFeedEl = document.getElementById('chatFeed');
const stateModeEl = document.getElementById('stateMode');
const stateStrategyEl = document.getElementById('stateStrategy');
const stateApprovalEl = document.getElementById('stateApproval');
const stateTaskEl = document.getElementById('stateTask');
const approvalSummaryEl = document.getElementById('approvalSummary');
let activeRunId = '';
let activeTypingNode = null;
let liveDraftLines = [];
let approvalCountdownTimer = null;
let autoApproveOn = false;
const CHAT_STORE_KEY = 'chromeclaw.chat.sessions.v1';
const MAX_SESSION_MESSAGES = 200;
let chatState = { activeId: '', sessions: [] };
let persistTimer = null;

function setStatus(text) {
  if (statusEl) statusEl.textContent = truncateText(text, 28);
}

function truncateText(text, max = 140) {
  const raw = String(text || '');
  return raw.length > max ? `${raw.slice(0, max - 1)}…` : raw;
}

function makeSessionId() {
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function defaultSessionName() {
  return `Session ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function createEmptySession(name = defaultSessionName()) {
  return {
    id: makeSessionId(),
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: []
  };
}

function schedulePersistChatState() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    chrome.storage.local.set({ [CHAT_STORE_KEY]: chatState }).catch(() => {});
  }, 120);
}

function currentSession() {
  return chatState.sessions.find((s) => s.id === chatState.activeId) || null;
}

function ensureChatState() {
  if (!Array.isArray(chatState.sessions) || !chatState.sessions.length) {
    const session = createEmptySession();
    chatState = { activeId: session.id, sessions: [session] };
  }
  if (!chatState.activeId || !chatState.sessions.some((s) => s.id === chatState.activeId)) {
    chatState.activeId = chatState.sessions[0].id;
  }
}

function sessionLabel(session) {
  const latest = session.messages?.[session.messages.length - 1];
  if (latest?.role === 'user' && latest.text) return truncateText(latest.text, 42);
  if (session.name) return truncateText(session.name, 42);
  return 'Session';
}

function renderSessionOptions() {
  if (!sessionSelectEl) return;
  sessionSelectEl.innerHTML = '';
  for (const session of chatState.sessions) {
    const opt = document.createElement('option');
    opt.value = session.id;
    opt.textContent = sessionLabel(session);
    if (session.id === chatState.activeId) opt.selected = true;
    sessionSelectEl.appendChild(opt);
  }
}

function appendMessageToState(msg) {
  const session = currentSession();
  if (!session) return;
  session.messages.push(msg);
  if (session.messages.length > MAX_SESSION_MESSAGES) {
    session.messages = session.messages.slice(-MAX_SESSION_MESSAGES);
  }
  if (msg.role === 'user' && msg.text) {
    session.name = truncateText(msg.text, 36);
  }
  session.updatedAt = new Date().toISOString();
  renderSessionOptions();
  schedulePersistChatState();
}

function renderMessagesFromState() {
  if (!chatFeedEl) return;
  chatFeedEl.innerHTML = '';
  const session = currentSession();
  if (!session || !Array.isArray(session.messages) || !session.messages.length) {
    appendMessage({
      role: 'system',
      title: 'System',
      text: 'Chat ready. Start a task or ask to inspect this page.',
      persist: true
    });
    return;
  }
  for (const msg of session.messages) {
    appendMessage({
      role: msg.role || 'system',
      title: msg.title || 'System',
      text: msg.text || '',
      typing: false,
      persist: false
    });
  }
}

async function loadChatState() {
  try {
    const saved = await chrome.storage.local.get(CHAT_STORE_KEY);
    const data = saved?.[CHAT_STORE_KEY];
    if (data && typeof data === 'object') {
      chatState = {
        activeId: data.activeId || '',
        sessions: Array.isArray(data.sessions) ? data.sessions : []
      };
    }
  } catch {
    // ignore
  }
  ensureChatState();
  renderSessionOptions();
  renderMessagesFromState();
  schedulePersistChatState();
}

function switchSession(id) {
  if (!id) return;
  if (!chatState.sessions.some((s) => s.id === id)) return;
  chatState.activeId = id;
  renderSessionOptions();
  renderMessagesFromState();
  schedulePersistChatState();
}

function createSessionAndSwitch() {
  const session = createEmptySession();
  chatState.sessions.unshift(session);
  chatState.activeId = session.id;
  renderSessionOptions();
  renderMessagesFromState();
  schedulePersistChatState();
}

function deleteCurrentSession() {
  if (chatState.sessions.length <= 1) {
    clearCurrentSessionMessages();
    return;
  }
  const idx = chatState.sessions.findIndex((s) => s.id === chatState.activeId);
  if (idx < 0) return;
  chatState.sessions.splice(idx, 1);
  chatState.activeId = chatState.sessions[Math.max(0, idx - 1)]?.id || chatState.sessions[0].id;
  renderSessionOptions();
  renderMessagesFromState();
  schedulePersistChatState();
}

function clearCurrentSessionMessages() {
  const session = currentSession();
  if (!session) return;
  session.messages = [];
  session.updatedAt = new Date().toISOString();
  renderMessagesFromState();
  schedulePersistChatState();
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
  if (mutation === 'auto' && high === 'auto') return 'Auto';
  if (mutation === 'confirm' && high === 'confirm') return 'Manual';
  return `M:${mutation} · H:${high}`;
}

function providerModeLabel(kind) {
  const map = {
    cloud: 'Cloud Agent',
    local: 'Local Heuristic',
    openai_compatible: 'OpenAI Compatible',
    anthropic_compatible: 'Anthropic Compatible',
    zhipu_compatible: 'Zhipu GLM',
    zai_coding_global: 'Z.AI Coding Global',
    zai_coding_cn: 'Z.AI Coding CN'
  };
  return map[kind] || String(kind || 'unknown');
}

function detectAutoApprove(settings) {
  const mutation = settings?.mutationPolicy || 'auto';
  const high = settings?.highRiskPolicy || 'confirm';
  return mutation === 'auto' && high === 'auto';
}

function refreshAutoApproveToggle() {
  if (!autoApproveToggleBtn) return;
  autoApproveToggleBtn.textContent = `Auto Approve: ${autoApproveOn ? 'ON' : 'OFF'}`;
}

function updateGlobalState(partial = {}) {
  if (partial.mode && stateModeEl) stateModeEl.textContent = providerModeLabel(partial.mode);
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
    const live = document.createElement('div');
    live.className = 'typing-live';
    live.textContent = '';
    bubble.append(label, dots, live);
  } else {
    bubble.textContent = text || '(empty)';
  }

  wrap.append(meta, bubble);
  return { wrap, bubble };
}

function appendMessage({ role, title, text, typing = false, persist = !typing }) {
  if (!chatFeedEl) return null;
  const node = createMessageNode({ role, title, text, typing });
  chatFeedEl.appendChild(node.wrap);
  scrollChatToBottom();
  if (persist) {
    appendMessageToState({
      role: role || 'system',
      title: title || 'System',
      text: String(text || '')
    });
  }
  return node.wrap;
}

function appendTraceLine(line) {
  if (!traceEl) return;
  const next = `${nowLabel()}  ${line}`;
  traceEl.textContent = traceEl.textContent ? `${traceEl.textContent}\n${next}` : next;
  traceEl.scrollTop = traceEl.scrollHeight;
}

function clearApprovalCountdown() {
  if (!approvalCountdownTimer) return;
  clearInterval(approvalCountdownTimer);
  approvalCountdownTimer = null;
}

function findEarliestApprovalDeadline(items) {
  const deadlines = (items || [])
    .map((item) => {
      const created = new Date(item.createdAt || 0).getTime();
      const timeout = Number(item.timeoutMs) || 0;
      if (!created || !timeout) return 0;
      return created + timeout;
    })
    .filter(Boolean);
  if (!deadlines.length) return 0;
  return Math.min(...deadlines);
}

function formatRemainMs(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function refreshApprovalCountdown(items) {
  const deadline = findEarliestApprovalDeadline(items);
  if (!deadline) {
    clearApprovalCountdown();
    if (!activeRunId) setStatus('Idle');
    return;
  }

  const update = () => {
    const remain = deadline - Date.now();
    setStatus(`Waiting approval ${formatRemainMs(remain)}`);
    if (remain <= 0) clearApprovalCountdown();
  };
  update();
  clearApprovalCountdown();
  approvalCountdownTimer = setInterval(update, 1000);
}

function setTypingProgress(text, live = '') {
  if (!activeTypingNode) return;
  const label = activeTypingNode.querySelector('.typing-label');
  const liveEl = activeTypingNode.querySelector('.typing-live');
  if (label) label.textContent = text || 'Executing plan';
  if (liveEl) liveEl.textContent = live || '';
}

function pushDraftLine(line) {
  const content = truncateText(String(line || '').replace(/\s+/g, ' ').trim(), 220);
  if (!content) return;
  const last = liveDraftLines[liveDraftLines.length - 1] || '';
  if (last === content) return;
  liveDraftLines.push(content);
  if (liveDraftLines.length > 5) liveDraftLines = liveDraftLines.slice(-5);
  const merged = liveDraftLines.map((l, i) => `${i + 1}. ${l}`).join('\n');
  setTypingProgress('Analyzing (live draft)...', merged);
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
  const clientRunId = `run-ui-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  activeRunId = clientRunId;
  liveDraftLines = [];
  if (resultEl) resultEl.textContent = '';
  if (traceEl) traceEl.textContent = '';
  appendTraceLine('Run started');
  runBtn.disabled = true;

  const typingMsg = appendMessage({
    role: 'assistant',
    title: 'ChromeClaw',
    text: 'Executing plan',
    typing: true
  });
  activeTypingNode = typingMsg;
  setTypingProgress('Executing plan', 'Waiting for first tool call...');

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'chromeclaw.run_agent',
      tabId,
      goal,
      clientRunId
    });

    if (!response?.ok) {
      throw new Error(response?.error || 'Agent failed');
    }

    const result = response.result || {};
    const answer = result.answer || '(empty)';
    if (resultEl) resultEl.textContent = answer;
    if (traceEl) {
      const finalTrace = (result.trace || []).join('\n') || '(none)';
      traceEl.textContent = traceEl.textContent
        ? `${traceEl.textContent}\n----- final -----\n${finalTrace}`
        : finalTrace;
    }

    if (typingMsg?.parentNode) typingMsg.remove();
    activeTypingNode = null;
    activeRunId = '';
    liveDraftLines = [];
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
    let msg = String(err);
    if (msg.includes('Provider error (500)')) {
      msg += '\n\nProvider network failed. Retry in 5-10s, or switch provider endpoint in Options.';
    }
    if (resultEl) resultEl.textContent = msg;
    if (typingMsg?.parentNode) typingMsg.remove();
    activeTypingNode = null;
    activeRunId = '';
    liveDraftLines = [];
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
  if (approvalSummaryEl) {
    approvalSummaryEl.textContent = `Action Approval (${items.length})`;
  }
  if (approvalsPanelEl && items.length > 0) {
    approvalsPanelEl.open = true;
  }
  refreshApprovalCountdown(items);
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
    autoApproveOn = detectAutoApprove(settings);
    refreshAutoApproveToggle();
    updateGlobalState({
      mode: settings?.providerKind || 'openai_compatible',
      strategy: resolveStrategyByHost(host),
      approval: approvalModeLabel(settings),
      task: 'Idle'
    });
  } catch {
    autoApproveOn = false;
    refreshAutoApproveToggle();
    updateGlobalState({
      mode: 'unknown',
      strategy: 'generic',
      approval: '-',
      task: 'Idle'
    });
  }
}

async function toggleAutoApprove() {
  const nextOn = !autoApproveOn;
  const payload = nextOn
    ? { mutationPolicy: 'auto', highRiskPolicy: 'auto', autoExecute: true }
    : { mutationPolicy: 'confirm', highRiskPolicy: 'confirm', autoExecute: true };

  const response = await chrome.runtime.sendMessage({
    type: 'chromeclaw.save_settings',
    payload
  });
  if (!response?.ok) {
    throw new Error(response?.error || 'Failed to save auto-approve setting');
  }

  autoApproveOn = detectAutoApprove(response.settings || payload);
  refreshAutoApproveToggle();
  updateGlobalState({
    approval: approvalModeLabel(response.settings || payload)
  });
  appendMessage({
    role: 'system',
    title: 'Policy',
    text: autoApproveOn
      ? 'Auto Approve enabled: mutation and high-risk actions run automatically.'
      : 'Auto Approve disabled: mutation and high-risk actions require confirmation.'
  });
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
if (autoApproveToggleBtn) {
  autoApproveToggleBtn.addEventListener('click', () => {
    toggleAutoApprove().catch((error) => {
      appendMessage({ role: 'system', title: 'Error', text: String(error) });
    });
  });
}
if (newChatBtn) {
  newChatBtn.addEventListener('click', () => {
    createSessionAndSwitch();
    appendMessage({
      role: 'system',
      title: 'System',
      text: 'New chat started.',
      persist: true
    });
  });
}
if (sessionSelectEl) {
  sessionSelectEl.addEventListener('change', () => switchSession(sessionSelectEl.value));
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'chromeclaw.approval_updated') {
    loadApprovals();
    return;
  }
  if (message?.type !== 'chromeclaw.agent_event') return;
  if (!activeRunId) return;
  if (String(message.runId || '') !== String(activeRunId)) return;

  const event = message.event || {};
  const phase = String(event.phase || '');
  if (phase === 'start') {
    appendTraceLine(`start strategy=${event.strategy || 'generic'} host=${event.siteHost || '-'}`);
    return;
  }
  if (phase === 'turn') {
    appendTraceLine(`turn ${event.turn}`);
    return;
  }
  if (phase === 'assistant_draft') {
    appendTraceLine(`assistant_draft turn=${event.turn ?? '-'}`);
    pushDraftLine(event.contentPreview || '');
    return;
  }
  if (phase === 'tool_start') {
    const text = `Running ${event.toolName}...`;
    setTypingProgress(text, `turn ${event.turn ?? '-'} · ${event.toolName}`);
    updateGlobalState({ task: text });
    appendTraceLine(`tool_start ${event.toolName} turn=${event.turn ?? '-'}`);
    return;
  }
  if (phase === 'tool_done') {
    appendTraceLine(
      `tool_done ${event.toolName} turn=${event.turn ?? '-'} status=${event.status || 'ok'} ${event.elapsedMs || 0}ms`
    );
    return;
  }
  if (phase === 'tool_blocked') {
    appendTraceLine(`tool_blocked ${event.toolName} reason=${event.reason || 'blocked'}`);
    setTypingProgress(`Blocked on ${event.toolName}`, event.reason || 'approval/policy');
    return;
  }
  if (phase === 'tool_error') {
    appendTraceLine(`tool_error ${event.toolName} ${event.error || ''}`);
    setTypingProgress(`Error in ${event.toolName}`, truncateText(event.error || '', 80));
    return;
  }
  if (phase === 'complete') {
    appendTraceLine(`complete mode=${event.mode || 'cloud'}`);
  }
});

let approvalPollTimer = null;

function startApprovalPolling() {
  if (approvalPollTimer) return;
  approvalPollTimer = setInterval(() => {
    if (document.visibilityState === 'visible') {
      loadApprovals();
    }
  }, 4000);
}

function stopApprovalPolling() {
  if (!approvalPollTimer) return;
  clearInterval(approvalPollTimer);
  approvalPollTimer = null;
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    loadApprovals();
    startApprovalPolling();
  } else {
    stopApprovalPolling();
  }
});

loadApprovals();
bootstrapState();
loadChatState();
startApprovalPolling();
