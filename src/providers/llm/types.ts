export type ProviderName = "openai" | "anthropic" | "google";

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface GenerateInput {
  system: string;
  user: string;
  temperature?: number;
  model?: string;
}

export interface GenerateResult<T> {
  data: T;
  usage: TokenUsage;
  model: string;
  provider: ProviderName;
  latencyMs: number;
  estimatedCost: number;
}

export interface LLMProvider {
  name: ProviderName;
  defaultModel: string;
  isAvailable(): boolean;
  generate<T>(
    input: GenerateInput,
    schema: import("zod").ZodType<T>,
    schemaName: string
  ): Promise<GenerateResult<T>>;
}

export interface ProviderInfo {
  name: ProviderName;
  label: string;
  defaultModel: string;
  available: boolean;
}
