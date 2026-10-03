import { z } from "zod";

export const IdeaIntakeSchema = z.object({
  problem: z.string().min(1),
  targetUsers: z.array(z.string()).min(1),
  domain: z.string().min(1),
  constraints: z.array(z.string()),
  initialHypothesis: z.string().min(1),
});

export type IdeaIntake = z.infer<typeof IdeaIntakeSchema>;

export const IdeaCandidateSchema = z.object({
  title: z.string().min(1),
  problem: z.string().min(1),
  solution: z.string().min(1),
  targetUsers: z.array(z.string()).min(1),
  valueProposition: z.string().min(1),
  differentiator: z.string().min(1),
});

export type IdeaCandidate = z.infer<typeof IdeaCandidateSchema>;

export const BrainstormOutputSchema = z.object({
  candidates: z.array(IdeaCandidateSchema).min(3).max(5),
  reasoningSummary: z.string().min(1),
});

export type BrainstormOutput = z.infer<typeof BrainstormOutputSchema>;

export const SCHEMA_VERSION = "1.0";
