import type { LLMProfile } from "./types";

export const DEFAULT_LLM_PROFILE: LLMProfile = {
  id: "default-openai-compatible",
  name: "My LLM profile",
  key: "",
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4.1",
};

export function isUsableLLMProfile(profile: LLMProfile | null | undefined): profile is LLMProfile {
  return Boolean(profile?.name.trim() && profile?.key.trim() && profile?.baseUrl.trim() && profile?.model.trim());
}

export function createLLMProfile(input: Partial<LLMProfile>): LLMProfile {
  return {
    ...DEFAULT_LLM_PROFILE,
    ...input,
    id: input.id || `llm-${Date.now()}`,
  };
}
