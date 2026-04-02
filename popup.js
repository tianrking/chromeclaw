const goalEl = document.getElementById('goal');
const runBtn = document.getElementById('run');
const resultEl = document.getElementById('result');
const traceEl = document.getElementById('trace');
const statusEl = document.getElementById('status');
const openOptionsBtn = document.getElementById('openOptions');
const approvalsEl = document.getElementById('approvals');
const chatFeedEl = document.getElementById('chatFeed');

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function nowLabel() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function appendMessage({ role, title, text }) {
  if (!chatFeedEl) return;
  const wrap = document.createElement('article');
  wrap.className = `msg msg-${role}`;

  const meta = document.createElement('div');
  meta.className = 'msg-meta';
  meta.textContent = `${title} · ${nowLabel()}`;

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.textContent = text || '(empty)';

  wrap.append(meta, bubble);
  chatFeedEl.appendChild(wrap);
  chatFeedEl.scrollTop = chatFeedEl.scrollHeight;
}

async function getActiveTabId() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs?.[0]?.id;
}

async function runAgent() {
  const goal = goalEl?.value.trim() || '';
  if (!goal) {
    setStatus('Please enter a goal.');
    return;
  }

  appendMessage({ role: 'user', title: 'You', text: goal });

  const tabId = await getActiveTabId();
  if (!tabId) {
    setStatus('No active tab found.');
    appendMessage({ role: 'system', title: 'System', text: 'No active tab found.' });
    return;
  }

  setStatus('Running...');
  if (resultEl) resultEl.textContent = '';
  if (traceEl) traceEl.textContent = '';
  runBtn.disabled = true;

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
    appendMessage({ role: 'assistant', title: 'ChromeClaw', text: answer });
    setStatus(`Done (${result.mode || 'unknown'} mode)`);
  } catch (err) {
    const msg = String(err);
    if (resultEl) resultEl.textContent = msg;
    appendMessage({ role: 'system', title: 'Error', text: msg });
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
    approvalsEl.textContent = 'No pending approvals.';
    return;
  }

  for (const item of items) {
    const wrap = document.createElement('div');
    wrap.className = 'approval-item';

    const meta = document.createElement('div');
    meta.className = 'approval-meta';
    meta.textContent =
      `${item.toolName} | risk=${item.riskLevel || 'normal'} | strategy=${item.strategy || 'generic'} | turn=${item.turn ?? '-'}`;

    const args = document.createElement('pre');
    args.className = 'approval-args';
    args.textContent = JSON.stringify(item.args || {}, null, 2);

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

    actions.append(approve, reject);
    wrap.append(meta, args, actions);
    approvalsEl.appendChild(wrap);
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
    text: 'Chat UI ready. Ask ChromeClaw to inspect, extract, or automate this page.'
  });
}

setInterval(loadApprovals, 1500);
loadApprovals();
