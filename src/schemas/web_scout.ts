import { z } from "zod";

export const EvidenceItemSchema = z.object({
  claim: z.string().min(1),
  evidenceType: z.enum([
    "competitor",
    "market_trend",
    "user_pain",
    "pricing",
    "distribution",
    "regulatory",
  ]),
  sourceTitle: z.string().min(1),
  sourceUrl: z.string().min(1),
  excerpt: z.string().min(1),
  relevance: z.number().min(0).max(1).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

export const WebScoutOutputSchema = z.object({
  queries: z.array(z.string()).min(3).max(8),
  sources: z.array(
    z.object({
      title: z.string().min(1),
      url: z.string().min(1),
      snippet: z.string().min(1),
      relevance: z.number().min(0).max(1).optional(),
    })
  ),
  evidence: z.array(EvidenceItemSchema).min(3).max(12),
  reasoningSummary: z.string().min(1),
});

export type WebScoutOutput = z.infer<typeof WebScoutOutputSchema>;

export const WEB_SCOUT_SYSTEM_PROMPT = `You are the Web Scout Agent for IdeaOS.

Goal: convert untrusted web snippets into structured, evidence-backed claims.

Rules:
- You MUST only produce claims that are supported by the provided snippets.
- If a claim cannot be supported, do not include it.
- Output JSON strictly matching the schema.
- Provide a concise reasoningSummary.`;

