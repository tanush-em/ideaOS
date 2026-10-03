import type { CritiqueOutput } from "@/schemas/critic";
import type { ExpansionOutput } from "@/schemas/expansion";
import type { MarketAnalystOutput } from "@/schemas/market_analyst";
import type { WebScoutOutput } from "@/schemas/web_scout";
import { RefinerOutputSchema, type RefinerOutput } from "@/schemas/refiner";
import {
  generateWithRetry,
  type AgentExecutionContext,
  type AgentExecutionResult,
  persistAgentRun,
} from "@/lib/agents/execute";

const SYSTEM = `You are the Refiner Agent for IdeaOS. Synthesize expansion, criticism, and market notes into an improved product concept.

Produce:
- refinedTitle, refinedProblem, refinedSolution
- targetUsers, valueProposition, differentiator
- mvpScope: 2-week MVP items (max 5-7)
- killCriteria: when to abandon this idea (specific signals)
- keyChanges: what changed from the original expansion based on criticism
- reasoningSummary

Do not ignore valid criticism. Strengthen weak areas or narrow scope.`;

export async function runRefinerAgent(
  ctx: AgentExecutionContext,
  expansion: ExpansionOutput,
  critique: CritiqueOutput,
  webScout: WebScoutOutput,
  marketAnalyst: MarketAnalystOutput
): Promise<AgentExecutionResult<RefinerOutput>> {
  const user = `EXPANSION:
Title: ${expansion.selectedCandidateTitle}
MVP: ${expansion.mvpFeatures.join("; ")}
Assumptions: ${expansion.assumptions.join("; ")}

CRITIC (score ${critique.score}/10, ${critique.recommendation}):
Weaknesses: ${critique.weaknesses.join("; ")}
Risks: ${critique.risks.join("; ")}

WEB RESEARCH:
Reasoning: ${webScout.reasoningSummary}
Evidence count: ${webScout.evidence.length}
Top evidence:
${webScout.evidence
  .slice(0, 5)
  .map((e) => `- ${e.claim} (${e.sourceUrl})`)
  .join("\n")}

MARKET SCORES:
Overall ${marketAnalyst.scores.overall}/10
Market opportunity: ${marketAnalyst.scores.marketOpportunity}
Competition: ${marketAnalyst.scores.competition}
Differentiation: ${marketAnalyst.scores.differentiation}
Feasibility: ${marketAnalyst.scores.feasibility}
Monetization: ${marketAnalyst.scores.monetization}
User pain: ${marketAnalyst.scores.userPain}

Key findings:
${marketAnalyst.keyFindings.map((k) => `- ${k}`).join("\n")}
Evidence highlights:
${marketAnalyst.evidenceHighlights
  .slice(0, 5)
  .map((h) => `- ${h.claim} (${h.sourceUrl})`)
  .join("\n")}

Refine into a stronger, more focused concept.`;

  const result = await generateWithRetry(
    ctx.provider,
    SYSTEM,
    user,
    RefinerOutputSchema,
    "refiner_output",
    0.6
  );

  const runId = await persistAgentRun(ctx, {
    agentName: "refiner",
    stage: "refiner",
    input: { critique_score: critique.score },
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
