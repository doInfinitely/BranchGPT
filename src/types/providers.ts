import type { Provider, GenerationParams } from "./conversation";

export interface ModelOption {
  id: string;
  name: string;
  provider: Provider;
  supportsVision: boolean;
  maxContextTokens: number;
}

export const OPENAI_MODELS: ModelOption[] = [
  // Frontier
  { id: "gpt-5.4", name: "GPT-5.4", provider: "openai", supportsVision: true, maxContextTokens: 1000000 },
  { id: "gpt-5.4-pro", name: "GPT-5.4 Pro", provider: "openai", supportsVision: true, maxContextTokens: 1000000 },
  { id: "gpt-5.2", name: "GPT-5.2 Thinking", provider: "openai", supportsVision: true, maxContextTokens: 1000000 },
  { id: "gpt-5", name: "GPT-5", provider: "openai", supportsVision: true, maxContextTokens: 1000000 },
  { id: "gpt-5-mini", name: "GPT-5 Mini", provider: "openai", supportsVision: true, maxContextTokens: 1000000 },
  { id: "gpt-5-nano", name: "GPT-5 Nano", provider: "openai", supportsVision: true, maxContextTokens: 1000000 },
  // GPT-4.x
  { id: "gpt-4.1", name: "GPT-4.1", provider: "openai", supportsVision: true, maxContextTokens: 1047576 },
  { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", provider: "openai", supportsVision: true, maxContextTokens: 1047576 },
  { id: "gpt-4.1-nano", name: "GPT-4.1 Nano", provider: "openai", supportsVision: true, maxContextTokens: 1047576 },
  { id: "gpt-4o", name: "GPT-4o", provider: "openai", supportsVision: true, maxContextTokens: 128000 },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai", supportsVision: true, maxContextTokens: 128000 },
  // Reasoning
  { id: "o3", name: "o3", provider: "openai", supportsVision: false, maxContextTokens: 200000 },
  { id: "o3-pro", name: "o3 Pro", provider: "openai", supportsVision: false, maxContextTokens: 200000 },
  { id: "o3-mini", name: "o3 Mini", provider: "openai", supportsVision: false, maxContextTokens: 200000 },
  { id: "o4-mini", name: "o4 Mini", provider: "openai", supportsVision: false, maxContextTokens: 200000 },
];

export const ANTHROPIC_MODELS: ModelOption[] = [
  { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", provider: "anthropic", supportsVision: true, maxContextTokens: 200000 },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", provider: "anthropic", supportsVision: true, maxContextTokens: 200000 },
  { id: "claude-opus-4-6", name: "Claude Opus 4.6", provider: "anthropic", supportsVision: true, maxContextTokens: 200000 },
];

export const ALL_MODELS = [...OPENAI_MODELS, ...ANTHROPIC_MODELS];

export function getModelsForProvider(provider: Provider): ModelOption[] {
  return provider === "openai" ? OPENAI_MODELS : ANTHROPIC_MODELS;
}

export function getDefaultModel(provider: Provider): string {
  return provider === "openai" ? "gpt-4o" : "claude-sonnet-4-6";
}

export interface ChatRequest {
  messages: ChatMessage[];
  model: string;
  provider: Provider;
  generationParams: GenerationParams;
  apiKey: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentBlock[];
}

export interface ContentBlock {
  type: "text" | "image_url" | "image";
  text?: string;
  image_url?: { url: string };
  source?: { type: "base64"; media_type: string; data: string };
}
