import { BaseProvider } from './base.js';

function summarizeSnapshot(snapshot) {
  const topLinks = (snapshot.links || []).slice(0, 20);
  const topHeadings = (snapshot.headings || []).slice(0, 10);
  const topParas = (snapshot.paragraphs || []).slice(0, 8);

  return [
    `Title: ${snapshot.title || ''}`,
    `URL: ${snapshot.url || ''}`,
    `Description: ${snapshot.description || '(none)'}`,
    '',
    'Headings:',
    ...topHeadings.map((h) => `- ${h.text}`),
    '',
    'Key Paragraphs:',
    ...topParas.map((p) => `- ${p}`),
    '',
    `Top Links (${topLinks.length}):`,
    ...topLinks.map((l, i) => `${i + 1}. ${l.text || '(no text)'} | ${l.href}`)
  ].join('\n');
}

export class LocalHeuristicProvider extends BaseProvider {
  constructor() {
    super('local_heuristic');
  }

  async complete({ goal, snapshot }) {
    const lower = goal.toLowerCase();

    if (/summary|summarize|总结|摘要/.test(lower)) {
      return {
        content: `本地模式摘要：\n\n${summarizeSnapshot(snapshot || {})}`,
        tool_calls: []
      };
    }

    if (/link|链接|网址|url/.test(lower)) {
      const links = (snapshot.links || []).slice(0, 40);
      return {
        content: `页面链接（${links.length} 条）：\n\n${links
          .map((l, i) => `${i + 1}. ${l.text || '(no text)'}\n   ${l.href}`)
          .join('\n')}`,
        tool_calls: []
      };
    }

    return {
      content: [
        '当前运行在本地启发式模式。',
        '已成功抓取当前页的结构化信息。',
        '要获得复杂自动化能力，请在 Options 配置云端 provider（OpenAI-compatible）。'
      ].join('\n'),
      tool_calls: []
    };
  }
}
