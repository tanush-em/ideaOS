import type { CritiqueOutput } from "@/schemas/critic";
import type { ExpansionOutput } from "@/schemas/expansion";
import type { RefinerOutput } from "@/schemas/refiner";
import type { MarketAnalystOutput } from "@/schemas/market_analyst";
import { BlueprintOutputSchema, type BlueprintOutput } from "@/schemas/blueprint";
import {
  generateWithRetry,
  type AgentExecutionContext,
  type AgentExecutionResult,
  persistAgentRun,
} from "@/lib/agents/execute";

const SYSTEM = `You are the Blueprint Agent for IdeaOS. Produce an implementation-ready product blueprint for a founder.

Include all sections: product definition, market, product features, business model, tech stack, milestones (3 phases), risks, kill criteria, recommendation.

Tech stack should be practical for a solo founder (e.g. Next.js, Supabase, LLM APIs).

Milestones: Phase 1 (2 weeks MVP), Phase 2 (growth), Phase 3 (scale) with deliverables.

Be specific and actionable — this is what the founder builds next.`;

export async function runBlueprintAgent(
  ctx: AgentExecutionContext,
  expansion: ExpansionOutput,
  critique: CritiqueOutput,
  refiner: RefinerOutput,
  marketAnalyst: MarketAnalystOutput
): Promise<AgentExecutionResult<BlueprintOutput>> {
  const user = `REFINED CONCEPT:
${refiner.refinedTitle}
Problem: ${refiner.refinedProblem}
Solution: ${refiner.refinedSolution}
Users: ${refiner.targetUsers.join(", ")}
Value: ${refiner.valueProposition}
Differentiator: ${refiner.differentiator}
MVP scope: ${refiner.mvpScope.join("; ")}
Kill criteria: ${refiner.killCriteria.join("; ")}

EXPANSION CONTEXT:
Personas: ${expansion.userPersonas.map((p) => p.name).join(", ")}
Monetization options: ${expansion.monetizationOptions.join("; ")}

CRITIC SCORE: ${critique.score}/10 (${critique.recommendation})

MARKET SCORES: overall ${marketAnalyst.scores.overall}/10

Generate the full founder blueprint.`;

  const result = await generateWithRetry(
    ctx.provider,
    SYSTEM,
    user,
    BlueprintOutputSchema,
    "blueprint_output",
    0.5
  );

  const runId = await persistAgentRun(ctx, {
    agentName: "blueprint",
    stage: "blueprint",
    input: { refined_title: refiner.refinedTitle },
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
