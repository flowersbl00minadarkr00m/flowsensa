/// <reference types="node" />

import { lookup } from "dns/promises";

interface ApiRequest {
  method?: string;
  body?: unknown;
}

interface ApiResponse {
  status(code: number): ApiResponse;
  setHeader(name: string, value: string): void;
  json(body: unknown): void;
}

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ProxyRequestBody {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  messages?: Message[];
  maxTokens?: number;
}

const BLOCKED_HOSTS = new Set(["localhost", "metadata.google.internal"]);
const BLOCKED_SUFFIXES = [".local", ".internal", ".lan", ".home", ".corp", ".intranet"];
const TIMEOUT_MS = 45_000;

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (lower === "::" || lower === "::1") return true;
  if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  const v4Mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4Mapped) return isPrivateIPv4(v4Mapped[1]);
  return false;
}

function isPrivateAddress(ip: string): boolean {
  return ip.includes(":") ? isPrivateIPv6(ip) : isPrivateIPv4(ip);
}

function parseBody(body: unknown): ProxyRequestBody {
  if (typeof body === "string") return JSON.parse(body) as ProxyRequestBody;
  return (body ?? {}) as ProxyRequestBody;
}

function getPublicChatUrl(rawBaseUrl: string): URL {
  const base = rawBaseUrl.trim().replace(/\/+$/, "");
  const url = new URL(`${base}/chat/completions`);
  if (url.protocol !== "https:") throw new Error("Only HTTPS LLM endpoints are allowed.");
  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(hostname)) throw new Error("Local or metadata hosts are not allowed.");
  if (BLOCKED_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) throw new Error("Private network hosts are not allowed.");
  if (!hostname.includes(".")) throw new Error("Single-label hosts are not allowed.");
  return url;
}

async function assertPublicDns(hostname: string): Promise<void> {
  const records = await lookup(hostname, { all: true, verbatim: true });
  if (records.length === 0) throw new Error("LLM endpoint host did not resolve.");
  if (records.some((record) => isPrivateAddress(record.address))) {
    throw new Error("LLM endpoint resolves to a private or reserved address.");
  }
}

function providerError(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } | string; message?: string };
    const message = typeof parsed.error === "string" ? parsed.error : parsed.error?.message ?? parsed.message;
    return message ? `LLM provider error ${status}: ${message}` : `LLM provider error ${status}`;
  } catch {
    return body ? `LLM provider error ${status}: ${body.slice(0, 240)}` : `LLM provider error ${status}`;
  }
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = parseBody(req.body);
    const baseUrl = body.baseUrl?.trim();
    const apiKey = body.apiKey?.trim();
    const model = body.model?.trim();
    const messages = body.messages;

    if (!baseUrl || !apiKey || !model || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "Missing baseUrl, apiKey, model, or messages." });
      return;
    }

    const chatUrl = getPublicChatUrl(baseUrl);
    await assertPublicDns(chatUrl.hostname);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const upstream = await fetch(chatUrl, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://flowsensa.vercel.app",
        "X-Title": "FlowSensa",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: Math.min(Math.max(body.maxTokens ?? 800, 1), 2000),
      }),
    });
    clearTimeout(timer);

    const text = await upstream.text();
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: providerError(upstream.status, text) });
      return;
    }

    const data = JSON.parse(text) as { choices?: Array<{ message?: { content?: string } }> };
    res.status(200).json({ content: data.choices?.[0]?.message?.content ?? "No response received." });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "LLM request failed." });
  }
}
