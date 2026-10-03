import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { z } from "zod";
import { estimateCost } from "./cost";
import { parseAndValidate } from "./json-schema";
import type { GenerateInput, GenerateResult, LLMProvider } from "./types";

export class OpenAIProvider implements LLMProvider {
  name = "openai" as const;
  defaultModel = "gpt-4o-mini";

  private client: OpenAI | null = null;

  private getClient(): OpenAI {
    if (!this.client) {
      this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return this.client;
  }

  isAvailable(): boolean {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  async generate<T>(
    input: GenerateInput,
    schema: z.ZodType<T>,
    schemaName: string
  ): Promise<GenerateResult<T>> {
    const start = Date.now();
    const model = input.model ?? this.defaultModel;
    const client = this.getClient();

    try {
      const completion = await client.chat.completions.parse({
        model,
        temperature: input.temperature ?? 0.7,
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user },
        ],
        response_format: zodResponseFormat(schema, schemaName),
      });

      const message = completion.choices[0]?.message;
      if (message?.refusal) {
        throw new Error(`Model refused: ${message.refusal}`);
      }
      if (!message?.parsed) {
        throw new Error("No parsed output from OpenAI");
      }

      const usage = completion.usage;
      const inputTokens = usage?.prompt_tokens ?? 0;
      const outputTokens = usage?.completion_tokens ?? 0;
      const latencyMs = Date.now() - start;

      return {
        data: message.parsed as T,
        usage: { inputTokens, outputTokens },
        model,
        provider: this.name,
        latencyMs,
        estimatedCost: estimateCost(
          this.name,
          model,
          inputTokens,
          outputTokens
        ),
      };
    } catch (err) {
      // Fallback to JSON mode if structured parse fails on some models
      if (err instanceof OpenAI.APIError) {
        throw new Error(`OpenAI error: ${err.message}`);
      }
      throw err;
    }
  }

  /** JSON fallback for repair retries */
  async generateJson<T>(
    input: GenerateInput,
    schema: z.ZodType<T>
  ): Promise<GenerateResult<T>> {
    const start = Date.now();
    const model = input.model ?? this.defaultModel;
    const client = this.getClient();

    const completion = await client.chat.completions.create({
      model,
      temperature: input.temperature ?? 0.3,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.user },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const validated = parseAndValidate(schema, raw);
    if (!validated.success) {
      throw new Error(`Validation failed: ${validated.error}`);
    }

    const inputTokens = completion.usage?.prompt_tokens ?? 0;
    const outputTokens = completion.usage?.completion_tokens ?? 0;

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
