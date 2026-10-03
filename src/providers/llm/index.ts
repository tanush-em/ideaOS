import { OpenAIProvider } from "./openai";
import { AnthropicProvider } from "./anthropic";
import { GoogleProvider } from "./google";
import type { LLMProvider, ProviderInfo, ProviderName } from "./types";

export type { ProviderName, LLMProvider, ProviderInfo } from "./types";

const providers: Record<ProviderName, LLMProvider> = {
  openai: new OpenAIProvider(),
  anthropic: new AnthropicProvider(),
  google: new GoogleProvider(),
};

export function getProvider(name: ProviderName): LLMProvider {
  const provider = providers[name];
  if (!provider.isAvailable()) {
    throw new Error(
      `Provider "${name}" is not configured. Add the API key to your environment.`
    );
  }
  return provider;
}

export function getAvailableProviders(): ProviderInfo[] {
  return [
    {
      name: "openai",
      label: "OpenAI",
      defaultModel: providers.openai.defaultModel,
      available: providers.openai.isAvailable(),
    },
    {
      name: "anthropic",
      label: "Anthropic",
      defaultModel: providers.anthropic.defaultModel,
      available: providers.anthropic.isAvailable(),
    },
    {
      name: "google",
      label: "Google",
      defaultModel: providers.google.defaultModel,
      available: providers.google.isAvailable(),
    },
  ];
}

export function getDefaultProvider(): LLMProvider {
  const order: ProviderName[] = ["openai", "anthropic", "google"];
  for (const name of order) {
    if (providers[name].isAvailable()) return providers[name];
  }
  throw new Error(
    "No LLM provider configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_GENERATIVE_AI_API_KEY."
  );
}

export function resolveProvider(
  name?: ProviderName | null
): LLMProvider {
  if (name) return getProvider(name);
  return getDefaultProvider();
}
