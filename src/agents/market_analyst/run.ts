import type { AgentExecutionContext } from "@/lib/agents/execute";
import { generateWithRetry, persistAgentRun } from "@/lib/agents/execute";
import type { ExpansionOutput } from "@/schemas/expansion";
import type { CritiqueOutput } from "@/schemas/critic";
import type { WebScoutOutput } from "@/schemas/web_scout";
import { MarketAnalystOutputSchema, type MarketAnalystOutput } from "@/schemas/market_analyst";
import { z } from "zod";
import type { AgentExecutionResult } from "@/lib/agents/execute";

export async function runMarketAnalystAgent(
  ctx: AgentExecutionContext,
  expansion: ExpansionOutput,
  critique: CritiqueOutput,
  webScout: WebScoutOutput
): Promise<AgentExecutionResult<MarketAnalystOutput>> {
  const SYSTEM = `You are the Market Analyst Agent for IdeaOS.

Use the provided evidence items to produce grounded market scores.

Rules:
- Scores must be consistent with evidence.
- Don't invent facts.
- keyFindings should summarize the evidence-driven reasoning.
- evidenceHighlights should pick the most important supporting evidence.`;

  // Limit prompt size: only keep top evidence
  const evidence = webScout.evidence.slice(0, 10);

  const user = `Candidate: ${expansion.selectedCandidateTitle}

Use cases: ${expansion.useCases.slice(0, 4).join("; ")}
MVP features: ${expansion.mvpFeatures.slice(0, 6).join("; ")}
Monetization options: ${expansion.monetizationOptions.slice(0, 4).join("; ")}

Critic recommendation: ${critique.recommendation} (score ${critique.score}/10)

Evidence items (JSON):
${JSON.stringify(evidence, null, 2)}

Now produce market opportunity, competition, differentiation, feasibility, monetization, user pain, and overall score (0-10) and include key findings.`;

  const result = await generateWithRetry(
    ctx.provider,
    SYSTEM,
    user,
    MarketAnalystOutputSchema,
    "market_analyst_output",
    0.5
  );

  const runId = await persistAgentRun(ctx, {
    agentName: "market_analyst",
    stage: "market_analyst",
    input: {
      candidate_title: expansion.selectedCandidateTitle,
      evidence_count: evidence.length,
    },
    result: {
      data: result.data,
      model: result.model,
      provider: result.provider,
      usage: result.usage,
      latencyMs: result.latencyMs,
      estimatedCost: result.estimatedCost,
    },
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

