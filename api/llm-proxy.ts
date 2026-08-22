/// <reference types="node" />

/**
 * Opt-in, bounded LLM relay for self-hosted FlowSensa deployments.
 * The public demo leaves this endpoint disabled. Enabled deployments must
 * explicitly allow each provider hostname.
 */
import { lookup } from 'node:dns/promises';
import type { LookupFunction } from 'node:net';
import https from 'node:https';
import ipaddr from 'ipaddr.js';

interface ApiRequest {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
}

interface ApiResponse {
  status(code: number): ApiResponse;
  setHeader(name: string, value: string): void;
  json(body: unknown): void;
}

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ProxyRequestBody {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  messages?: Message[];
  maxTokens?: number;
}

interface ResolvedAddress {
  address: string;
  family: 4 | 6;
}

const DEFAULT_ALLOWED_HOSTS = ['openrouter.ai', 'api.openai.com'];
const BLOCKED_HOSTS = new Set(['localhost', 'metadata.google.internal']);
const BLOCKED_SUFFIXES = ['.local', '.internal', '.lan', '.home', '.corp', '.intranet'];
const TIMEOUT_MS = 30_000;
const RESPONSE_LIMIT = 1024 * 1024;
const RATE_WINDOW_MS = 10 * 60_000;
const RATE_LIMIT = 20;
const requestWindows = new Map<string, { startedAt: number; count: number }>();

function clientAddress(req: ApiRequest): string {
  const forwarded = req.headers?.['x-forwarded-for'];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return value?.split(',')[0]?.trim() || 'unknown';
}

function allowRequest(key: string, now = Date.now()): boolean {
  const current = requestWindows.get(key);
  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    requestWindows.set(key, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= RATE_LIMIT) return false;
  current.count += 1;
  return true;
}

export function allowedHosts(raw = process.env.FLOWSENSA_LLM_ALLOWED_HOSTS ?? ''): Set<string> {
  const configured = raw.split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
  return new Set(configured.length ? configured : DEFAULT_ALLOWED_HOSTS);
}

export function isPublicAddress(address: string): boolean {
  try {
    return ipaddr.process(address).range() === 'unicast';
  } catch {
    return false;
  }
}

export function getAllowedChatUrl(rawBaseUrl: string, allowlist = allowedHosts()): URL {
  if (!rawBaseUrl || rawBaseUrl.length > 2_048) throw new Error('URL_BLOCKED');
  const base = rawBaseUrl.trim().replace(/\/+$/, '');
  const url = new URL(`${base}/chat/completions`);
  const hostname = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('URL_BLOCKED');
  if (BLOCKED_HOSTS.has(hostname) || BLOCKED_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    throw new Error('URL_BLOCKED');
  }
  if (!allowlist.has(hostname)) throw new Error('HOST_NOT_ALLOWED');
  return url;
}

export function validateProxyBody(body: ProxyRequestBody): asserts body is Required<Pick<ProxyRequestBody, 'baseUrl' | 'apiKey' | 'model' | 'messages'>> & ProxyRequestBody {
  if (typeof body.baseUrl !== 'string' || typeof body.apiKey !== 'string' || typeof body.model !== 'string' || !Array.isArray(body.messages)) {
    throw new Error('INVALID_BODY');
  }
  if (body.apiKey.trim().length < 8 || body.apiKey.length > 8_192 || body.model.trim().length < 1 || body.model.length > 160) {
    throw new Error('INVALID_BODY');
  }
  if (body.messages.length < 1 || body.messages.length > 24) throw new Error('INVALID_BODY');
  let total = 0;
  for (const message of body.messages) {
    if (!message || !['system', 'user', 'assistant'].includes(message.role) || typeof message.content !== 'string') {
      throw new Error('INVALID_BODY');
    }
    total += message.content.length;
    if (message.content.length > 20_000 || total > 60_000) throw new Error('INVALID_BODY');
  }
  if (body.maxTokens !== undefined && (!Number.isInteger(body.maxTokens) || body.maxTokens < 1 || body.maxTokens > 2_000)) {
    throw new Error('INVALID_BODY');
  }
}

async function resolvePublicAddress(hostname: string): Promise<ResolvedAddress> {
  const records = await lookup(hostname, { all: true, verbatim: true });
  if (!records.length || records.some((record) => !isPublicAddress(record.address))) throw new Error('DNS_BLOCKED');
  return { address: records[0].address, family: records[0].family as 4 | 6 };
}

function postPinned(url: URL, pinned: ResolvedAddress, authorization: string, payload: string): Promise<{ status: number; contentType: string; text: string }> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let received = 0;
    const pinnedLookup: LookupFunction = (_hostname, _options, callback) => {
      callback(null, pinned.address, pinned.family);
    };
    const request = https.request(url, {
      method: 'POST',
      lookup: pinnedLookup,
      servername: url.hostname,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'identity',
        Authorization: authorization,
        'Content-Length': Buffer.byteLength(payload),
        'User-Agent': 'FlowSensa/0.2',
      },
    }, (response) => {
      response.on('data', (chunk: Buffer | Uint8Array | string) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        received += buffer.byteLength;
        if (received > RESPONSE_LIMIT) {
          response.destroy(new Error('RESPONSE_TOO_LARGE'));
          return;
        }
        chunks.push(buffer);
      });
      response.on('end', () => resolve({
        status: response.statusCode ?? 502,
        contentType: String(response.headers['content-type'] ?? ''),
        text: Buffer.concat(chunks).toString('utf8'),
      }));
      response.on('error', reject);
    });
    request.setTimeout(TIMEOUT_MS, () => request.destroy(new Error('UPSTREAM_TIMEOUT')));
    request.on('error', reject);
    request.end(payload);
  });
}

function parseBody(body: unknown): ProxyRequestBody {
  if (typeof body === 'string') return JSON.parse(body) as ProxyRequestBody;
  if (!body || typeof body !== 'object') throw new Error('INVALID_BODY');
  return body as ProxyRequestBody;
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Use POST.' });
    return;
  }
  if (process.env.FLOWSENSA_LLM_PROXY_ENABLED !== '1') {
    res.status(503).json({ error: 'The LLM relay is disabled on this deployment.' });
    return;
  }
  if (!allowRequest(clientAddress(req))) {
    res.setHeader('Retry-After', '600');
    res.status(429).json({ error: 'Too many requests. Try again later.' });
    return;
  }

  try {
    const body = parseBody(req.body);
    validateProxyBody(body);
    const chatUrl = getAllowedChatUrl(body.baseUrl);
    const pinned = await resolvePublicAddress(chatUrl.hostname);
    const payload = JSON.stringify({
      model: body.model.trim(),
      messages: body.messages,
      max_tokens: body.maxTokens ?? 800,
    });
    const upstream = await postPinned(chatUrl, pinned, `Bearer ${body.apiKey.trim()}`, payload);
    if (upstream.status < 200 || upstream.status >= 300 || !/^application\/json\b/i.test(upstream.contentType)) {
      res.status(502).json({ error: 'The configured provider did not return a valid response.' });
      return;
    }
    const data = JSON.parse(upstream.text) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.length > 100_000) throw new Error('INVALID_RESPONSE');
    res.status(200).json({ content });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (['INVALID_BODY', 'URL_BLOCKED', 'HOST_NOT_ALLOWED'].includes(code)) {
      res.status(400).json({ error: code === 'HOST_NOT_ALLOWED' ? 'That provider hostname is not allowed by this deployment.' : 'The request is invalid.' });
      return;
    }
    res.status(code === 'UPSTREAM_TIMEOUT' ? 504 : 502).json({ error: 'The provider request could not be completed safely.' });
  }
}
