import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import { estimateCost } from "./cost";
import { parseAndValidate, zodToJsonSchemaObject } from "./json-schema";
import type { GenerateInput, GenerateResult, LLMProvider } from "./types";

export class AnthropicProvider implements LLMProvider {
  name = "anthropic" as const;
  defaultModel = "claude-3-5-haiku-20241022";

  private client: Anthropic | null = null;

  private getClient(): Anthropic {
    if (!this.client) {
      this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
    return this.client;
  }

  isAvailable(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  }

  async generate<T>(
    input: GenerateInput,
    schema: z.ZodType<T>,
    schemaName: string
  ): Promise<GenerateResult<T>> {
    const start = Date.now();
    const model = input.model ?? this.defaultModel;
    const client = this.getClient();
    const jsonSchema = zodToJsonSchemaObject(schema, schemaName);

    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      temperature: input.temperature ?? 0.7,
      system: `${input.system}\n\nRespond with JSON matching this schema: ${JSON.stringify(jsonSchema)}`,
      messages: [{ role: "user", content: input.user }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const raw = textBlock?.type === "text" ? textBlock.text : "";
    const validated = parseAndValidate(schema, extractJson(raw));
    if (!validated.success) {
      throw new Error(`Validation failed: ${validated.error}`);
    }

    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;

    return {
      data: validated.data,
      usage: { inputTokens, outputTokens },
      model,
      provider: this.name,
      latencyMs: Date.now() - start,
      estimatedCost: estimateCost(
        this.name,
        model,
        inputTokens,
        outputTokens
      ),
    };
  }
}

function extractJson(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) return text.slice(start, end + 1);
  return text;
}
