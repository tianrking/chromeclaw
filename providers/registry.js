import { LocalHeuristicProvider } from './local-heuristic.js';
import { AnthropicCompatibleProvider } from './anthropic-compatible.js';
import { OpenAICompatibleProvider } from './openai-compatible.js';

const PROVIDER_PRESETS = {
  openai_compatible: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4.1-mini'
  },
  anthropic_compatible: {
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-3-7-sonnet-latest'
  },
  zhipu_compatible: {
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-5'
  },
  zai_coding_global: {
    baseUrl: 'https://api.z.ai/api/coding/paas/v4',
    model: 'glm-5'
  },
  zai_coding_cn: {
    baseUrl: 'https://open.bigmodel.cn/api/coding/paas/v4',
    model: 'glm-5'
  }
};

function withPreset(settings) {
  const preset = PROVIDER_PRESETS[settings?.providerKind] || {};
  return {
    ...settings,
    baseUrl: (settings?.baseUrl || '').trim() || preset.baseUrl || settings?.baseUrl,
    model: (settings?.model || '').trim() || preset.model || settings?.model
  };
}

export function createProvider(settings) {
  if (!settings.apiKey) {
    return new LocalHeuristicProvider();
  }

  const next = withPreset(settings);

  if (settings.providerKind === 'openai_compatible') {
    return new OpenAICompatibleProvider(next);
  }

  if (settings.providerKind === 'zhipu_compatible') {
    return new OpenAICompatibleProvider(next);
  }

  if (settings.providerKind === 'zai_coding_global') {
    return new OpenAICompatibleProvider(next);
  }

  if (settings.providerKind === 'zai_coding_cn') {
    return new OpenAICompatibleProvider(next);
  }

  if (settings.providerKind === 'anthropic_compatible') {
    return new AnthropicCompatibleProvider(next);
  }

  return new OpenAICompatibleProvider(next);
}
