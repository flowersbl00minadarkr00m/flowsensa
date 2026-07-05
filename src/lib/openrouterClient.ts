import type { OpenRouterConfig } from '../domain/types';

export async function sendAnalystQuery(
  config: OpenRouterConfig,
  context: string,
): Promise<string> {
  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.key}`,
      'HTTP-Referer': 'https://flowsensa.vercel.app',
      'X-Title': 'Flowsensa AI Analyst',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'system',
          content:
            'You are an advisory process analyst. Analyze the provided process context. Distinguish measured facts from hypotheses. All output is advisory only.',
        },
        { role: 'user', content: context },
      ],
      max_tokens: 800,
    }),
  });
  if (!resp.ok) throw new Error(`OpenRouter error: ${resp.status}`);
  const data = (await resp.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? 'No response received.';
}
