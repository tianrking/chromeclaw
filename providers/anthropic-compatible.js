import { BaseProvider } from './base.js';
import { safeJsonParse } from '../core/shared-utils.js';

function normalizeText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => {
        if (typeof c === 'string') return c;
        if (c?.type === 'text') return c.text || '';
        return '';
      })
      .join('\n')
      .trim();
  }
  return '';
}

function toAnthropicTools(openAiStyleTools) {
  return (openAiStyleTools || []).map((tool) => ({
    name: tool.function.name,
    description: tool.function.description || '',
    input_schema: tool.function.parameters || { type: 'object', properties: {} }
  }));
}

function toAnthropicMessages(internalMessages) {
  const out = [];

  for (const msg of internalMessages || []) {
    if (msg.role === 'system') continue;

    if (msg.role === 'user') {
      out.push({ role: 'user', content: normalizeText(msg.content) });
      continue;
    }

    if (msg.role === 'assistant') {
      const blocks = [];
      const txt = normalizeText(msg.content);
      if (txt) blocks.push({ type: 'text', text: txt });

      for (const call of msg.tool_calls || []) {
        const input = safeJsonParse(call.function?.arguments || '{}', {});
        blocks.push({
          type: 'tool_use',
          id: call.id,
          name: call.function?.name || 'unknown_tool',
          input
        });
      }

      out.push({ role: 'assistant', content: blocks.length ? blocks : [{ type: 'text', text: '' }] });
      continue;
    }

    if (msg.role === 'tool') {
      const toolUseId = msg.tool_call_id;
      let parsed = msg.content;
      parsed = safeJsonParse(msg.content || '{}', msg.content);

      out.push({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: toolUseId,
            content: typeof parsed === 'string' ? parsed : JSON.stringify(parsed),
            is_error: false
          }
        ]
      });
    }
  }

  return out;
}

function fromAnthropicResponse(message) {
  const blocks = message?.content || [];
  const tool_calls = [];
  const texts = [];

  for (const block of blocks) {
    if (block?.type === 'text') {
      if (block.text) texts.push(block.text);
      continue;
    }

    if (block?.type === 'tool_use') {
      tool_calls.push({
        id: block.id,
        type: 'function',
        function: {
          name: block.name,
          arguments: JSON.stringify(block.input || {})
        }
      });
    }
  }

  return {
    content: texts.join('\n').trim(),
    tool_calls
  };
}

export class AnthropicCompatibleProvider extends BaseProvider {
  constructor({ baseUrl, apiKey, model, temperature = 0.2 }) {
    super('anthropic_compatible');
    this.baseUrl = (baseUrl || 'https://api.anthropic.com').replace(/\/$/, '');
    this.apiKey = apiKey || '';
    this.model = model || 'claude-3-7-sonnet-latest';
    this.temperature = temperature;
  }

  async complete({ messages, tools, systemPrompt = '' }) {
    if (!this.apiKey) {
      throw new Error('API key missing for anthropic_compatible provider');
    }

    const anthropicMessages = toAnthropicMessages(messages || []);
    const payload = {
      model: this.model,
      max_tokens: 4096,
      temperature: this.temperature,
      system: systemPrompt || '',
      messages: anthropicMessages,
      tools: toAnthropicTools(tools)
    };

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Anthropic provider error (${response.status}): ${text.slice(0, 1200)}`);
    }

    const data = await response.json();
    return fromAnthropicResponse(data);
  }
}
