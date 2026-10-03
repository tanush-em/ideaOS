import { NextResponse } from "next/server";
import { getDefaultProvider, resolveProvider } from "@/providers/llm";
import { generateWithRetry } from "@/lib/agents/execute";
import {
  BRAINSTORM_SYSTEM_PROMPT,
  buildBrainstormUserPrompt,
} from "@/agents/brainstorm/prompt";
import { BrainstormOutputSchema } from "@/schemas/brainstorm";
import type { ProviderName } from "@/providers/llm/types";
import { GOLDEN_IDEA_PROMPTS } from "@/tests/goldenIdeas";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const provider = body.provider as ProviderName | undefined;
  const maxTests = Math.min(Number(body.maxTests ?? 20), 30);

  const tests = GOLDEN_IDEA_PROMPTS.slice(0, maxTests);

  const results = await Promise.all(
    tests.map(async (prompt, idx) => {
      try {
        const res = await generateWithRetry(
          provider ?? null,
          BRAINSTORM_SYSTEM_PROMPT,
          buildBrainstormUserPrompt(prompt),
          BrainstormOutputSchema,
          "brainstorm_output",
          0.7
        );

        const ok = BrainstormOutputSchema.safeParse(res.data).success;

        return {
          idx,
          pass: ok,
          error: ok ? null : "Schema validation failed",
          estimatedCost: res.estimatedCost,
          tokens: res.usage,
        };
      } catch (err) {
        return {
          idx,
          pass: false,
          error: err instanceof Error ? err.message : "Unknown error",
          estimatedCost: 0,
          tokens: { inputTokens: 0, outputTokens: 0 },
        };
      }
    })
  );

  const passed = results.filter((r) => r.pass).length;
  const passRate = passed / results.length;
  const avgCost =
    results.reduce((sum, r) => sum + r.estimatedCost, 0) / results.length;

  return NextResponse.json({
    total: results.length,
    passed,
    passRate,
    avgCost,
    results,
  });
}

