import { safeJsonParse, truncateString } from '../shared-utils.js';

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

async function buildMultipartBody(multipart) {
  const form = new FormData();
  const fields = multipart?.fields && typeof multipart.fields === 'object' ? multipart.fields : {};
  for (const [k, v] of Object.entries(fields)) {
    form.append(String(k), String(v));
  }

  const files = Array.isArray(multipart?.files) ? multipart.files : [];
  for (const file of files.slice(0, 10)) {
    if (!file?.name || !file?.contentBase64) continue;
    const bytes = base64ToUint8Array(String(file.contentBase64));
    const blob = new Blob([bytes], {
      type: file.contentType ? String(file.contentType) : 'application/octet-stream'
    });
    form.append(String(file.name), blob, file.filename ? String(file.filename) : 'upload.bin');
  }

  return form;
}

async function buildCookieHeader(url, chromeApi) {
  const cookies = await chromeApi.cookies.getAll({ url });
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  return { cookieHeader, cookieCount: cookies.length };
}

async function readResponseByMode(response, maxChars, streamMode) {
  if (!streamMode || !response.body) {
    const text = await response.text();
    return {
      body: truncateString(text, maxChars),
      bodyChars: text.length,
      stream: null
    };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks = [];
  let total = 0;
  const maxChunks = 80;
  for (let i = 0; i < maxChunks; i += 1) {
    const part = await reader.read();
    if (part.done) break;
    const text = decoder.decode(part.value, { stream: true });
    chunks.push(text);
    total += text.length;
    if (total > maxChars) break;
  }

  const merged = chunks.join('');
  const body = truncateString(merged, maxChars);
  const stream = {
    mode: streamMode,
    chunkCount: chunks.length,
    preview: body
  };

  if (streamMode === 'sse') {
    const events = merged
      .split('\n\n')
      .map((block) => {
        const lines = block.split('\n');
        const dataLines = lines
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim());
        if (!dataLines.length) return null;
        return dataLines.join('\n');
      })
      .filter(Boolean)
      .slice(0, 40);
    stream.sseEvents = events;
  }

  return { body, bodyChars: merged.length, stream };
}

export async function httpRequest(args = {}, ctx) {
  const url = String(args.url || '').trim();
  if (!/^https?:\/\//i.test(url)) return { ok: false, error: 'http(s) url is required' };

  const method = String(args.method || 'GET').toUpperCase();
  const timeoutMs = Math.max(500, Math.min(60000, Number(args.timeoutMs) || 15000));
  const maxChars = Math.max(1000, Math.min(500000, Number(args.maxChars) || 100000));
  const expectJson = Boolean(args.expectJson);
  const streamMode = args.stream ? String(args.stream) : '';

  if (streamMode === 'websocket') {
    return {
      ok: false,
      error: 'websocket stream is not supported via fetch; use page.tap_websocket instead'
    };
  }

  const headers = {};
  if (args.headers && typeof args.headers === 'object') {
    for (const [k, v] of Object.entries(args.headers)) {
      if (!k) continue;
      headers[String(k)] = String(v);
    }
  }

  let body = undefined;
  if (args.multipart) {
    body = await buildMultipartBody(args.multipart);
  } else if (method !== 'GET' && method !== 'HEAD' && args.body != null) {
    body = String(args.body);
  }

  let cookieInfo = { cookieHeader: '', cookieCount: 0 };
  if (args.cookieJar && ctx.chrome?.cookies) {
    cookieInfo = await buildCookieHeader(url, ctx.chrome);
    if (cookieInfo.cookieHeader && !headers.Cookie && !headers.cookie) {
      headers.Cookie = cookieInfo.cookieHeader;
    }
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method,
      headers,
      body,
      signal: ctrl.signal,
      credentials: args.withCredentials ? 'include' : 'omit',
      redirect: args.followRedirects === false ? 'manual' : 'follow'
    });

    const bodyData = await readResponseByMode(response, maxChars, streamMode);
    const result = {
      ok: true,
      url,
      method,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: bodyData.body,
      bodyChars: bodyData.bodyChars,
      stream: bodyData.stream,
      json: expectJson ? safeJsonParse(bodyData.body, null) : null,
      cookieJar: args.cookieJar
        ? {
            enabled: true,
            attachedCookieCount: cookieInfo.cookieCount
          }
        : {
            enabled: false
          }
    };

    if (typeof ctx.recordHttpHistory === 'function') {
      const historyItem = await ctx.recordHttpHistory({
        request: {
          url,
          method,
          headers,
          hasMultipart: Boolean(args.multipart),
          stream: streamMode || null
        },
        response: {
          status: result.status,
          statusText: result.statusText,
          bodyPreview: result.body,
          bodyChars: result.bodyChars
        }
      });
      result.historyId = historyItem?.id || null;
    }

    return result;
  } catch (error) {
    const errResult = { ok: false, error: String(error), url, method };
    if (typeof ctx.recordHttpHistory === 'function') {
      await ctx.recordHttpHistory({
        request: { url, method, headers },
        response: { error: String(error) }
      });
    }
    return errResult;
  } finally {
    clearTimeout(timer);
  }
}

export async function httpHistoryList(args = {}, ctx) {
  if (!ctx.listHttpHistory) return { ok: false, error: 'history store unavailable' };
  const items = await ctx.listHttpHistory({ limit: args.limit });
  return { ok: true, items };
}

export async function httpHistoryGet(args = {}, ctx) {
  if (!ctx.getHttpHistoryItem) return { ok: false, error: 'history store unavailable' };
  const id = String(args.id || '').trim();
  if (!id) return { ok: false, error: 'id is required' };
  const item = await ctx.getHttpHistoryItem(id);
  return { ok: true, item };
}

export async function httpHistoryClear(_args, ctx) {
  if (!ctx.clearHttpHistory) return { ok: false, error: 'history store unavailable' };
  await ctx.clearHttpHistory();
  return { ok: true };
}
