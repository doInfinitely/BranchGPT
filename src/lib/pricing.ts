// Per-model pricing in cents per 1M tokens (our price with ~40% markup over cost)
interface ModelPricing {
  inputCentsPer1M: number;
  outputCentsPer1M: number;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI
  "gpt-4o": { inputCentsPer1M: 350, outputCentsPer1M: 1400 },
  "gpt-4o-mini": { inputCentsPer1M: 21, outputCentsPer1M: 84 },
  "gpt-4.1": { inputCentsPer1M: 280, outputCentsPer1M: 1120 },
  "gpt-4.1-mini": { inputCentsPer1M: 56, outputCentsPer1M: 224 },
  "gpt-4.1-nano": { inputCentsPer1M: 14, outputCentsPer1M: 56 },
  "o3": { inputCentsPer1M: 1400, outputCentsPer1M: 5600 },
  "o3-mini": { inputCentsPer1M: 154, outputCentsPer1M: 616 },
  "o4-mini": { inputCentsPer1M: 154, outputCentsPer1M: 616 },
  "gpt-4.5-preview": { inputCentsPer1M: 10500, outputCentsPer1M: 21000 },
  // Anthropic
  "claude-opus-4-6": { inputCentsPer1M: 2100, outputCentsPer1M: 10500 },
  "claude-sonnet-4-6": { inputCentsPer1M: 420, outputCentsPer1M: 2100 },
  "claude-haiku-4-5-20251001": { inputCentsPer1M: 112, outputCentsPer1M: 560 },
};

// Default pricing for unknown models (generous margin)
const DEFAULT_PRICING: ModelPricing = { inputCentsPer1M: 500, outputCentsPer1M: 2000 };

export function getPricing(model: string): ModelPricing {
  return MODEL_PRICING[model] ?? DEFAULT_PRICING;
}

export function computeCostCents(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = getPricing(model);
  const inputCost = (promptTokens / 1_000_000) * pricing.inputCentsPer1M;
  const outputCost = (completionTokens / 1_000_000) * pricing.outputCentsPer1M;
  return Math.ceil(inputCost + outputCost);
}
