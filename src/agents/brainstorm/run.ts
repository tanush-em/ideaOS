import {
  BrainstormOutputSchema,
  type BrainstormOutput,
} from "@/schemas/brainstorm";
import { resolveProvider } from "@/providers/llm";
import type { ProviderName } from "@/providers/llm/types";
import {
  generateWithRetry,
  type AgentExecutionContext,
  type AgentExecutionResult,
  persistAgentRun,
} from "@/lib/agents/execute";
import {
  BRAINSTORM_SYSTEM_PROMPT,
  buildBrainstormUserPrompt,
} from "./prompt";

export interface RunBrainstormInput {
  rawInput: string;
  provider?: ProviderName | null;
}

export interface RunBrainstormResult {
  output: BrainstormOutput;
  provider: string;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
  latencyMs: number;
  estimatedCost: number;
}

export async function runBrainstormForPipeline(
  ctx: AgentExecutionContext,
  rawInput: string
): Promise<AgentExecutionResult<BrainstormOutput>> {
  const userPrompt = buildBrainstormUserPrompt(rawInput);
  const result = await generateWithRetry(
    ctx.provider,
    BRAINSTORM_SYSTEM_PROMPT,
    userPrompt,
    BrainstormOutputSchema,
    "brainstorm_output",
    0.8
  );

  const runId = await persistAgentRun(ctx, {
    agentName: "brainstorm",
    stage: "brainstorm",
    input: { raw_input: rawInput },
    result,
    output: result.data,
  });

  return {
    output: result.data,
    runId,
    provider: result.provider,
    model: result.model,
    usage: result.usage,
    latencyMs: result.latencyMs,
    estimatedCost: result.estimatedCost,
  };
}

export async function runBrainstormAgent(
  input: RunBrainstormInput
): Promise<RunBrainstormResult> {
  const provider = resolveProvider(input.provider);
  const userPrompt = buildBrainstormUserPrompt(input.rawInput);

  let result = await provider.generate(
    {
      system: BRAINSTORM_SYSTEM_PROMPT,
      user: userPrompt,
      temperature: 0.8,
    },
    BrainstormOutputSchema,
    "brainstorm_output"
  );

  // One repair retry on validation issues (mainly for Anthropic/Google paths)
  if (!result.data.candidates?.length) {
    result = await provider.generate(
      {
        system: BRAINSTORM_SYSTEM_PROMPT,
        user: `${userPrompt}\n\nPrevious attempt failed. Return valid JSON with exactly 3-5 candidates.`,
        temperature: 0.5,
      },
      BrainstormOutputSchema,
      "brainstorm_output"
    );
  }

  return {
    output: result.data,
    provider: result.provider,
    model: result.model,
    usage: result.usage,
    latencyMs: result.latencyMs,
    estimatedCost: result.estimatedCost,
  };
}
