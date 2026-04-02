let seq = 0;
const pending = new Map();

function nowIso() {
  return new Date().toISOString();
}

function emitPendingUpdate() {
  try {
    chrome.runtime.sendMessage({ type: 'chromeclaw.approval_updated' });
  } catch {
    // popup may not be open
  }
}

export function listPendingApprovals() {
  return Array.from(pending.values()).map((item) => ({
    id: item.id,
    createdAt: item.createdAt,
    toolName: item.toolName,
    args: item.args,
    turn: item.turn,
    strategy: item.strategy,
    siteHost: item.siteHost || '',
    riskLevel: item.riskLevel || 'normal',
    timeoutMs: item.timeoutMs
  }));
}

export function requestApproval(payload, timeoutMs = 120000) {
  const id = `ap-${Date.now()}-${++seq}`;

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      emitPendingUpdate();
      resolve({ approved: false, reason: 'Approval timeout' });
    }, timeoutMs);

    pending.set(id, {
      id,
      createdAt: nowIso(),
      toolName: payload.toolName,
      args: payload.args,
      turn: payload.turn,
      strategy: payload.strategy,
      siteHost: payload.siteHost || '',
      riskLevel: payload.riskLevel || 'normal',
      timeoutMs,
      resolve,
      timer
    });

    emitPendingUpdate();
  });
}

export function resolveApproval(id, decision) {
  const item = pending.get(id);
  if (!item) return { ok: false, error: 'Approval request not found' };

  clearTimeout(item.timer);
  pending.delete(id);
  emitPendingUpdate();

  if (decision?.approved) {
    item.resolve({
      approved: true,
      patchedArgs: decision.patchedArgs && typeof decision.patchedArgs === 'object' ? decision.patchedArgs : undefined,
      reason: decision.reason || 'Approved'
    });
    return { ok: true };
  }

  item.resolve({ approved: false, reason: decision?.reason || 'Rejected by user' });
  return { ok: true };
}
