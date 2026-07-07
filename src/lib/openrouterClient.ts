import type { LLMProfile } from '../domain/types';

export async function sendAnalystQuery(
  config: LLMProfile,
  context: string,
): Promise<string> {
  const baseUrl = config.baseUrl.replace(/\/+$/, '');
  const resp = await fetch('/api/llm-proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      baseUrl,
      apiKey: config.key,
      model: config.model,
      messages: [
        {
          role: 'system',
          content:
            'You are an advisory process intelligence assistant. Distinguish measured facts, deterministic findings, hypotheses, and next checks. All output is advisory only.',
        },
        { role: 'user', content: context },
      ],
      maxTokens: 800,
    }),
  });
  const data = (await resp.json()) as {
    content?: string;
    error?: string;
  };
  if (!resp.ok) throw new Error(data.error ?? `LLM profile error: ${resp.status}`);
  return data.content ?? 'No response received.';
}
