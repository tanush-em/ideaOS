import type { ProviderName } from "./types";

/** Rough USD per 1M tokens — for display only */
const PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10 },
  "claude-3-5-haiku-20241022": { input: 0.25, output: 1.25 },
  "claude-3-5-sonnet-20241022": { input: 3, output: 15 },
  "gemini-3.6-flash": { input: 0.1, output: 0.4 },
  "gemini-2.0-flash": { input: 0.1, output: 0.4 },
  "gemini-2.0-flash-lite": { input: 0.075, output: 0.3 },
};

export function estimateCost(
  provider: ProviderName,
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const rates = PRICING[model] ?? getDefaultRates(provider);
  const cost =
    (inputTokens / 1_000_000) * rates.input +
    (outputTokens / 1_000_000) * rates.output;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

function getDefaultRates(provider: ProviderName) {
  switch (provider) {
    case "openai":
      return PRICING["gpt-4o-mini"];
    case "anthropic":
      return PRICING["claude-3-5-haiku-20241022"];
    case "google":
      return PRICING["gemini-3.6-flash"];
  }
}
