import { IdeaIntakeSchema, type IdeaIntake } from "@/schemas/intake";
import {
  generateWithRetry,
  type AgentExecutionContext,
  type AgentExecutionResult,
  persistAgentRun,
} from "@/lib/agents/execute";

const SYSTEM = `You are the Idea Intake Agent for IdeaOS. Normalize a founder's raw idea into structured fields.

Extract:
- problem: core user pain
- targetUsers: specific user segments (not "everyone")
- domain: industry/category
- constraints: budget, timeline, skills, regulatory limits (empty array if none stated)
- initialHypothesis: what the founder seems to want to build

Be faithful to the input. Do not invent constraints the founder didn't mention.`;

export async function runIntakeAgent(
  ctx: AgentExecutionContext,
  rawInput: string
): Promise<AgentExecutionResult<IdeaIntake>> {
  const result = await generateWithRetry(
    ctx.provider,
    SYSTEM,
    `Raw founder input:\n\n${rawInput}`,
    IdeaIntakeSchema,
    "idea_intake",
    0.4
  );

  const runId = await persistAgentRun(ctx, {
    agentName: "intake",
    stage: "intake",
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
