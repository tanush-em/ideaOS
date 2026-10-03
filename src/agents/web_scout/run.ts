import type { AgentExecutionContext } from "@/lib/agents/execute";
import { generateWithRetry } from "@/lib/agents/execute";
import { persistAgentRun } from "@/lib/agents/execute";
import { resolveSearchProvider } from "@/providers/search";
import type { SearchResult } from "@/providers/search/types";
import { z } from "zod";
import type { ExpansionOutput } from "@/schemas/expansion";
import {
  EvidenceItemSchema,
  WEB_SCOUT_SYSTEM_PROMPT,
  type EvidenceItem,
  type WebScoutOutput,
} from "@/schemas/web_scout";
import type { AgentExecutionResult } from "@/lib/agents/execute";
import { WebScoutOutputSchema } from "@/schemas/web_scout";

type SourceWithQuery = SearchResult & { query: string };

const QUERY_SYSTEM = `You are a query generator for IdeaOS.

Given a candidate product concept, generate search queries that will help extract evidence for:
- competitors
- market size / trends
- user pain / complaints
- pricing models

Return 3–6 distinct queries.`;

const QueryOutputSchema = z.object({
  queries: z.array(z.string().min(3)).min(3).max(6),
  reasoningSummary: z.string().min(1),
});

const EvidenceExtractionSchema = z.object({
  evidence: z.array(EvidenceItemSchema).min(3).max(12),
  reasoningSummary: z.string().min(1),
});

function dedupeByUrl(results: SourceWithQuery[]): SourceWithQuery[] {
  const seen = new Set<string>();
  const out: SourceWithQuery[] = [];
  for (const r of results) {
    if (!r.url) continue;
    if (seen.has(r.url)) continue;
    seen.add(r.url);
    out.push(r);
  }
  return out;
}

export async function runWebScoutAgent(
  ctx: AgentExecutionContext,
  expansion: ExpansionOutput
): Promise<AgentExecutionResult<WebScoutOutput>> {
  const searchProvider = resolveSearchProvider();

  const queryUser = `Candidate concept:
${expansion.selectedCandidateTitle}

Personas: ${expansion.userPersonas.map((p) => p.name).join(", ")}
Use cases: ${expansion.useCases.slice(0, 4).join("; ")}
MVP features: ${expansion.mvpFeatures.slice(0, 6).join("; ")}

Generate search queries to find evidence for competitors, market trends, user pain, and pricing.`;

  const queryResult = await generateWithRetry(
    ctx.provider,
    QUERY_SYSTEM,
    queryUser,
    QueryOutputSchema,
    "web_scout_queries",
    0.6
  );

  const queries = queryResult.data.queries;

  // Search and collect snippets
  const sources: SourceWithQuery[] = [];
  for (const q of queries) {
    const res = await searchProvider.search(q, 4);
    sources.push(...res.map((r) => ({ ...r, query: q })));
  }
  const deduped = dedupeByUrl(sources).slice(0, 8);

  // Persist queries + sources for the evidence system (Phase 4).
  // We store enough metadata to later attach evidence claims to sources.
  const queryIdByText = new Map<string, string>();
  for (const q of queries) {
    const { data, error } = await ctx.supabase
      .from("research_queries")
      .insert({
        idea_id: ctx.ideaId,
        project_id: ctx.projectId,
        user_id: ctx.userId,
        query_text: q,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(
        error?.message ?? "Failed to persist research query"
      );
    }
    queryIdByText.set(q, data.id);
  }

  const sourceIdByUrl = new Map<string, string>();
  for (const s of deduped) {
    const researchQueryId = queryIdByText.get(s.query);
    if (!researchQueryId) continue;

    const { data, error } = await ctx.supabase
      .from("research_sources")
      .insert({
        research_query_id: researchQueryId,
        idea_id: ctx.ideaId,
        project_id: ctx.projectId,
        user_id: ctx.userId,
        title: s.title,
        url: s.url,
        snippet: s.snippet,
        relevance: s.relevance,
        provider: searchProvider.name,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(
        error?.message ?? "Failed to persist research source"
      );
    }
    sourceIdByUrl.set(s.url, data.id);
  }

  const evidenceUser = `Extract evidence items from these web search snippets.

Candidate: ${expansion.selectedCandidateTitle}

Search provider: ${searchProvider.name}

Return only evidence items that are directly supported by snippets.

Snippets (JSON):
${JSON.stringify(deduped, null, 2)}`;

  const evidenceResult = await generateWithRetry(
    ctx.provider,
    WEB_SCOUT_SYSTEM_PROMPT,
    evidenceUser,
    EvidenceExtractionSchema,
    "web_scout_evidence",
    0.3
  );

  // Persist evidence claims to Supabase.
  // If a sourceUrl doesn't match an inserted source (rare), we skip it.
  await Promise.all(
    evidenceResult.data.evidence.map(async (e) => {
      const researchSourceId = sourceIdByUrl.get(e.sourceUrl);
      if (!researchSourceId) return;

      const { error } = await ctx.supabase.from("evidence").insert({
        research_source_id: researchSourceId,
        idea_id: ctx.ideaId,
        project_id: ctx.projectId,
        user_id: ctx.userId,
        claim: e.claim,
        evidence_type: e.evidenceType,
        excerpt: e.excerpt,
        relevance: e.relevance ?? 0.5,
        confidence: e.confidence ?? 0.5,
        source_title: e.sourceTitle,
        source_url: e.sourceUrl,
      });

      if (error) throw error;
    })
  );

  const output: WebScoutOutput = {
    queries,
    sources: deduped.map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.snippet,
      relevance: r.relevance,
    })),
    evidence: evidenceResult.data.evidence,
    reasoningSummary: evidenceResult.data.reasoningSummary,
  };

  // Store as an agent run + structured output
  const runId = await persistAgentRun(ctx, {
    agentName: "web_scout",
    stage: "web_scout",
    input: {
      candidate_title: expansion.selectedCandidateTitle,
      queries,
    },
    // We store the second call's usage/cost as the "primary" one for now.
    // (The pipeline cost accumulator still aggregates overall LLM calls.)
    result: {
      data: output,
      model: evidenceResult.model,
      provider: evidenceResult.provider,
      usage: evidenceResult.usage,
      latencyMs: evidenceResult.latencyMs,
      estimatedCost: evidenceResult.estimatedCost,
    },
    output,
  });

  return {
    output,
    runId,
    provider: evidenceResult.provider,
    model: evidenceResult.model,
    usage: evidenceResult.usage,
    latencyMs: evidenceResult.latencyMs,
    estimatedCost: evidenceResult.estimatedCost,
  };
}

