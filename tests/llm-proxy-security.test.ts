import { describe, expect, it } from 'vitest';
import { allowedHosts, getAllowedChatUrl, isPublicAddress, validateProxyBody } from '../api/llm-proxy';

describe('LLM proxy security boundary', () => {
  it('allows only explicitly configured HTTPS provider hosts', () => {
    const hosts = allowedHosts('openrouter.ai, api.example.com');
    expect(getAllowedChatUrl('https://openrouter.ai/api/v1', hosts).toString()).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(() => getAllowedChatUrl('https://attacker.example/api/v1', hosts)).toThrow('HOST_NOT_ALLOWED');
    expect(() => getAllowedChatUrl('http://openrouter.ai/api/v1', hosts)).toThrow('URL_BLOCKED');
  });

  it('rejects private, reserved, mapped-private, and malformed addresses', () => {
    for (const address of ['127.0.0.1', '10.0.0.1', '169.254.169.254', '192.0.2.1', '::1', 'fc00::1', '::ffff:127.0.0.1', 'not-an-ip']) {
      expect(isPublicAddress(address), address).toBe(false);
    }
    expect(isPublicAddress('1.1.1.1')).toBe(true);
    expect(isPublicAddress('2606:4700:4700::1111')).toBe(true);
  });

  it('bounds models, message count, message size, and output tokens', () => {
    const valid = { baseUrl: 'https://openrouter.ai/api/v1', apiKey: 'test-key-value', model: 'test-model', messages: [{ role: 'user' as const, content: 'hello' }], maxTokens: 500 };
    expect(() => validateProxyBody(valid)).not.toThrow();
    expect(() => validateProxyBody({ ...valid, messages: Array.from({ length: 25 }, () => valid.messages[0]) })).toThrow('INVALID_BODY');
    expect(() => validateProxyBody({ ...valid, messages: [{ role: 'user' as const, content: 'x'.repeat(20_001) }] })).toThrow('INVALID_BODY');
    expect(() => validateProxyBody({ ...valid, maxTokens: 2_001 })).toThrow('INVALID_BODY');
  });
});
