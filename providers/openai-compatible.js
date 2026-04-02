import { BaseProvider } from './base.js';

export class OpenAICompatibleProvider extends BaseProvider {
  constructor({ baseUrl, apiKey, model, temperature = 0.2, providerKind, reasoningEffort }) {
    super('openai_compatible');
    this.baseUrl = (baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
    this.apiKey = apiKey || '';
    this.model = model || 'gpt-4.1-mini';
    this.temperature = temperature;
    this.providerKind = providerKind || 'openai_compatible';
    this.reasoningEffort = reasoningEffort || 'off';
  }

  async complete({ messages, tools }) {
    if (!this.apiKey) {
      throw new Error('API key missing for openai_compatible provider');
    }

    const body = {
      model: this.model,
      temperature: this.temperature,
      messages,
      tools,
      tool_choice: 'auto'
    };

    const supportsReasoningParam =
      this.providerKind === 'zai_coding_global' ||
      this.providerKind === 'zai_coding_cn' ||
      this.providerKind === 'zhipu_compatible';
    const effort = String(this.reasoningEffort || 'off').toLowerCase();
    if (supportsReasoningParam && ['low', 'medium', 'high'].includes(effort)) {
      body.reasoning = { effort };
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Provider error (${response.status}): ${text.slice(0, 1200)}`);
    }

    const data = await response.json();
    const message = data?.choices?.[0]?.message;
    if (!message) throw new Error('Provider returned no choices');

    return message;
  }
}
