import type { LLMProfile } from '../domain/types';

export async function sendAnalystQuery(
  config: LLMProfile,
  context: string,
): Promise<string> {
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.key}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'system',
          content:
            'You are an advisory process intelligence assistant. Distinguish measured facts, deterministic findings, hypotheses, and next checks. All output is advisory only.',
        },
        { role: 'user', content: context },
      ],
      max_tokens: 800,
    }),
  });
  if (!resp.ok) throw new Error(`LLM profile error: ${resp.status}`);
  const data = (await resp.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? 'No response received.';
}
