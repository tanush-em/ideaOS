import { GoogleGenerativeAI } from "@google/generative-ai";
import type { z } from "zod";
import { estimateCost } from "./cost";
import {
  parseAndValidate,
  toGoogleResponseSchema,
  zodToJsonSchemaObject,
} from "./json-schema";
import type { GenerateInput, GenerateResult, LLMProvider } from "./types";

export class GoogleProvider implements LLMProvider {
  name = "google" as const;
  defaultModel = "gemini-3.6-flash";

  private client: GoogleGenerativeAI | null = null;

  private getClient(): GoogleGenerativeAI {
    if (!this.client) {
      this.client = new GoogleGenerativeAI(
        process.env.GOOGLE_GENERATIVE_AI_API_KEY!
      );
    }
    return this.client;
  }

  isAvailable(): boolean {
    return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  }

  async generate<T>(
    input: GenerateInput,
    schema: z.ZodType<T>,
    schemaName: string
  ): Promise<GenerateResult<T>> {
    const start = Date.now();
    const modelName = input.model ?? this.defaultModel;
    const client = this.getClient();
    const jsonSchema = toGoogleResponseSchema(
      zodToJsonSchemaObject(schema, schemaName)
    );

    const model = client.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: input.temperature ?? 0.7,
        responseMimeType: "application/json",
        responseSchema: jsonSchema as unknown as import("@google/generative-ai").Schema,
      },
      systemInstruction: input.system,
    });

    const result = await model.generateContent(input.user);
    const raw = result.response.text();
    const validated = parseAndValidate(schema, raw);
    if (!validated.success) {
      throw new Error(`Validation failed: ${validated.error}`);
    }

    const usage = result.response.usageMetadata;
    const inputTokens = usage?.promptTokenCount ?? 0;
    const outputTokens = usage?.candidatesTokenCount ?? 0;

    return {
      data: validated.data,
      usage: { inputTokens, outputTokens },
      model: modelName,
      provider: this.name,
      latencyMs: Date.now() - start,
      estimatedCost: estimateCost(
        this.name,
        modelName,
        inputTokens,
        outputTokens
      ),
    };
  }
}
