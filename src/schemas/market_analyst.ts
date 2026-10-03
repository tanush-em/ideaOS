import { z } from "zod";

export const MarketAnalystOutputSchema = z.object({
  scores: z.object({
    marketOpportunity: z.number().min(0).max(10),
    competition: z.number().min(0).max(10),
    differentiation: z.number().min(0).max(10),
    feasibility: z.number().min(0).max(10),
    monetization: z.number().min(0).max(10),
    userPain: z.number().min(0).max(10),
    overall: z.number().min(0).max(10),
  }),
  keyFindings: z.array(z.string()).min(3).max(8),
  evidenceHighlights: z.array(
    z.object({
      claim: z.string().min(1),
      sourceUrl: z.string().min(1),
    })
  ).min(3).max(8),
  reasoningSummary: z.string().min(1),
});

export type MarketAnalystOutput = z.infer<typeof MarketAnalystOutputSchema>;

