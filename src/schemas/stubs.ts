import { z } from "zod";

/** Stub output until Phase 4 web research */
export const WebScoutStubSchema = z.object({
  status: z.literal("stubbed"),
  message: z.string(),
  plannedQueries: z.array(z.string()),
  note: z.string(),
});

export type WebScoutStub = z.infer<typeof WebScoutStubSchema>;

/** Stub output until Phase 4 market research */
export const MarketAnalystStubSchema = z.object({
  status: z.literal("stubbed"),
  message: z.string(),
  scores: z.object({
    marketOpportunity: z.number().min(0).max(10),
    competition: z.number().min(0).max(10),
    differentiation: z.number().min(0).max(10),
    feasibility: z.number().min(0).max(10),
    monetization: z.number().min(0).max(10),
    userPain: z.number().min(0).max(10),
    overall: z.number().min(0).max(10),
  }),
  note: z.string(),
});

export type MarketAnalystStub = z.infer<typeof MarketAnalystStubSchema>;

export function createWebScoutStub(candidateTitle: string): WebScoutStub {
  return {
    status: "stubbed",
    message: "Web research skipped — available in Phase 4",
    plannedQueries: [
      `${candidateTitle} competitors`,
      `${candidateTitle} market size`,
      `${candidateTitle} user pain points`,
      `${candidateTitle} pricing models`,
    ],
    note: "Run Phase 4 to execute live web search and evidence extraction.",
  };
}

export function createMarketAnalystStub(): MarketAnalystStub {
  return {
    status: "stubbed",
    message: "Market analysis based on agent reasoning only — no live research",
    scores: {
      marketOpportunity: 7.0,
      competition: 6.0,
      differentiation: 7.0,
      feasibility: 7.5,
      monetization: 7.0,
      userPain: 7.5,
      overall: 7.0,
    },
    note: "Scores are estimates without web evidence. Phase 4 will ground these in sources.",
  };
}
