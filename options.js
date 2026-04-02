const FALLBACK_DEFAULTS = {};

const el = {
  providerKind: document.getElementById('providerKind'),
  responseFormat: document.getElementById('responseFormat'),
  baseUrl: document.getElementById('baseUrl'),
  apiKey: document.getElementById('apiKey'),
  model: document.getElementById('model'),
  reasoningEffort: document.getElementById('reasoningEffort'),
  maxTurns: document.getElementById('maxTurns'),
  maxSnapshotChars: document.getElementById('maxSnapshotChars'),
  mutationPolicy: document.getElementById('mutationPolicy'),
  highRiskPolicy: document.getElementById('highRiskPolicy'),
  autoExecute: document.getElementById('autoExecute'),
  temperature: document.getElementById('temperature'),
  save: document.getElementById('save'),
  status: document.getElementById('status')
};

function showStatus(text) {
  el.status.textContent = text;
  setTimeout(() => {
    if (el.status.textContent === text) el.status.textContent = '';
  }, 1600);
}

async function load() {
  let response = null;
  try {
    response = await chrome.runtime.sendMessage({ type: 'farito.get_settings' });
  } catch {
    response = null;
  }
  const data = { ...FALLBACK_DEFAULTS, ...(response?.settings || {}) };

  el.providerKind.value = data.providerKind;
  el.responseFormat.value = data.responseFormat || 'default';
  el.baseUrl.value = data.baseUrl;
  el.apiKey.value = data.apiKey;
  el.model.value = data.model;
  el.reasoningEffort.value = data.reasoningEffort || 'off';
  el.maxTurns.value = String(data.maxTurns);
  el.maxSnapshotChars.value = String(data.maxSnapshotChars);
  el.mutationPolicy.value =
    data.mutationPolicy || (data.autoExecute === false ? 'block' : 'auto');
  el.highRiskPolicy.value = data.highRiskPolicy || 'confirm';
  el.autoExecute.checked = Boolean(data.autoExecute);
  el.temperature.value = String(data.temperature);
  applyProviderDefaults();
  syncMutationControls();
}

async function save() {
  const payload = {
    providerKind: el.providerKind.value,
    responseFormat: el.responseFormat.value,
    baseUrl: el.baseUrl.value.trim(),
    apiKey: el.apiKey.value.trim(),
    model: el.model.value.trim(),
    reasoningEffort: el.reasoningEffort.value,
    maxTurns: Math.max(1, Math.min(12, Number(el.maxTurns.value) || 8)),
    maxSnapshotChars: Math.max(
      5000,
      Math.min(400000, Number(el.maxSnapshotChars.value) || 180000)
    ),
    mutationPolicy: el.mutationPolicy.value,
    highRiskPolicy: el.highRiskPolicy.value,
    autoExecute:
      el.mutationPolicy.value === 'block'
        ? false
        : el.mutationPolicy.value === 'confirm'
          ? true
          : Boolean(el.autoExecute.checked),
    temperature: Math.max(0, Math.min(2, Number(el.temperature.value) || 0.2))
  };

  const response = await chrome.runtime.sendMessage({ type: 'farito.save_settings', payload });
  if (!response?.ok) throw new Error(response?.error || 'Save failed');
  showStatus('Saved');
}

function applyProviderDefaults() {
  const kind = el.providerKind.value;

  if (kind === 'anthropic_compatible') {
    if (!el.baseUrl.value.trim() || el.baseUrl.value.includes('openai.com')) {
      el.baseUrl.value = 'https://api.anthropic.com';
    }
    if (!el.model.value.trim() || el.model.value.includes('gpt-')) {
      el.model.value = 'claude-3-7-sonnet-latest';
    }
    if (el.apiKey.placeholder !== 'sk-ant-...') {
      el.apiKey.placeholder = 'sk-ant-...';
    }
    return;
  }

  if (kind === 'zhipu_compatible') {
    if (!el.baseUrl.value.trim() || el.baseUrl.value.includes('openai.com') || el.baseUrl.value.includes('anthropic.com')) {
      el.baseUrl.value = 'https://open.bigmodel.cn/api/paas/v4';
    }
    if (!el.model.value.trim() || el.model.value.includes('gpt-') || el.model.value.includes('claude-')) {
      el.model.value = 'glm-5';
    }
    if (el.apiKey.placeholder !== 'zai-... / sk-...') {
      el.apiKey.placeholder = 'zai-... / sk-...';
    }
    return;
  }

  if (kind === 'zai_coding_global') {
    if (!el.baseUrl.value.trim() || el.baseUrl.value.includes('openai.com') || el.baseUrl.value.includes('anthropic.com')) {
      el.baseUrl.value = 'https://api.z.ai/api/coding/paas/v4';
    }
    if (!el.model.value.trim() || el.model.value.includes('gpt-') || el.model.value.includes('claude-')) {
      el.model.value = 'glm-5';
    }
    if (el.responseFormat.value !== 'coding_plan') {
      el.responseFormat.value = 'coding_plan';
    }
    if (el.reasoningEffort.value === 'off') {
      el.reasoningEffort.value = 'medium';
    }
    if (el.apiKey.placeholder !== 'zai-... / sk-...') {
      el.apiKey.placeholder = 'zai-... / sk-...';
    }
    return;
  }

  if (kind === 'zai_coding_cn') {
    if (!el.baseUrl.value.trim() || el.baseUrl.value.includes('openai.com') || el.baseUrl.value.includes('anthropic.com')) {
      el.baseUrl.value = 'https://open.bigmodel.cn/api/coding/paas/v4';
    }
    if (!el.model.value.trim() || el.model.value.includes('gpt-') || el.model.value.includes('claude-')) {
      el.model.value = 'glm-5';
    }
    if (el.responseFormat.value !== 'coding_plan') {
      el.responseFormat.value = 'coding_plan';
    }
    if (el.reasoningEffort.value === 'off') {
      el.reasoningEffort.value = 'medium';
    }
    if (el.apiKey.placeholder !== 'zai-... / sk-...') {
      el.apiKey.placeholder = 'zai-... / sk-...';
    }
    return;
  }

  {
    if (!el.baseUrl.value.trim() || el.baseUrl.value.includes('anthropic.com')) {
      el.baseUrl.value = 'https://api.openai.com/v1';
    }
    if (!el.model.value.trim() || el.model.value.includes('claude-')) {
      el.model.value = 'gpt-4.1-mini';
    }
    if (el.apiKey.placeholder !== 'sk-...') {
      el.apiKey.placeholder = 'sk-...';
    }
  }
}

function syncMutationControls() {
  const policy = el.mutationPolicy.value;
  if (policy === 'block') {
    el.autoExecute.checked = false;
    el.autoExecute.disabled = true;
  } else if (policy === 'confirm') {
    el.autoExecute.checked = true;
    el.autoExecute.disabled = true;
  } else {
    el.autoExecute.disabled = false;
  }
}

el.providerKind.addEventListener('change', applyProviderDefaults);
el.mutationPolicy.addEventListener('change', syncMutationControls);
el.save.addEventListener('click', () => {
  save().catch((error) => showStatus(`Save failed: ${String(error)}`));
});
load();
