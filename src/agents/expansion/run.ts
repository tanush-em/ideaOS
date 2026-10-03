import type { IdeaIntake } from "@/schemas/intake";
import type { BrainstormOutput } from "@/schemas/brainstorm";
import { ExpansionOutputSchema, type ExpansionOutput } from "@/schemas/expansion";
import {
  generateWithRetry,
  type AgentExecutionContext,
  type AgentExecutionResult,
  persistAgentRun,
} from "@/lib/agents/execute";

const SYSTEM = `You are the Expansion Agent for IdeaOS. Pick the strongest candidate from brainstorm results and expand it into a founder-ready concept.

Deliver:
- selectedCandidateTitle: which candidate you chose and why (title must match one from the list)
- userPersonas (2-3): name, description, painPoints
- workflows, useCases, monetizationOptions, mvpFeatures (concrete, buildable in weeks)
- assumptions and risks (honest)
- reasoningSummary: 2-3 sentences

Focus on what a solo founder could validate in 2-4 weeks.`;

export async function runExpansionAgent(
  ctx: AgentExecutionContext,
  intake: IdeaIntake,
  brainstorm: BrainstormOutput
): Promise<AgentExecutionResult<ExpansionOutput>> {
  const candidatesList = brainstorm.candidates
    .map(
      (c, i) =>
        `${i + 1}. ${c.title}\n   Problem: ${c.problem}\n   Solution: ${c.solution}\n   Users: ${c.targetUsers.join(", ")}\n   Value: ${c.valueProposition}\n   Differentiator: ${c.differentiator}`
    )
    .join("\n\n");

  const user = `Founder context:
Problem: ${intake.problem}
Target users: ${intake.targetUsers.join(", ")}
Domain: ${intake.domain}
Hypothesis: ${intake.initialHypothesis}

Brainstorm candidates:
${candidatesList}

Pick the best candidate and expand it thoroughly.`;

  const result = await generateWithRetry(
    ctx.provider,
    SYSTEM,
    user,
    ExpansionOutputSchema,
    "expansion_output",
    0.7
  );

  const runId = await persistAgentRun(ctx, {
    agentName: "expansion",
    stage: "expansion",
    input: { intake, brainstorm_summary: brainstorm.reasoningSummary },
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
