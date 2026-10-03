import type { ExpansionOutput } from "@/schemas/expansion";
import { CritiqueOutputSchema, type CritiqueOutput } from "@/schemas/critic";
import {
  generateWithRetry,
  type AgentExecutionContext,
  type AgentExecutionResult,
  persistAgentRun,
} from "@/lib/agents/execute";

const SYSTEM = `You are the Critic Agent for IdeaOS. Your job is adversarial — challenge this startup idea like a skeptical experienced founder or investor.

Find:
- strengths (be fair)
- weaknesses (crowded market, weak differentiation, unrealistic economics, technical complexity, regulatory risk, weak demand)
- risks and hidden assumptions
- score 0-10 (honest, not generous)
- recommendation: proceed | refine | reject

Ask: "Would a solo founder regret building this in 3 months?"

reasoningSummary: 2-3 sentences on your verdict.`;

export async function runCriticAgent(
  ctx: AgentExecutionContext,
  expansion: ExpansionOutput
): Promise<AgentExecutionResult<CritiqueOutput>> {
  const user = `Expanded idea to critique:

Title: ${expansion.selectedCandidateTitle}
Personas: ${expansion.userPersonas.map((p) => p.name).join(", ")}
MVP features: ${expansion.mvpFeatures.join("; ")}
Assumptions: ${expansion.assumptions.join("; ")}
Risks already noted: ${expansion.risks.join("; ")}
Monetization: ${expansion.monetizationOptions.join("; ")}

Attack weak points. Be specific, not generic.`;

  const result = await generateWithRetry(
    ctx.provider,
    SYSTEM,
    user,
    CritiqueOutputSchema,
    "critique_output",
    0.6
  );

  const runId = await persistAgentRun(ctx, {
    agentName: "critic",
    stage: "critic",
    input: { selected_candidate: expansion.selectedCandidateTitle },
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
