import { z } from "zod";

export const CritiqueOutputSchema = z.object({
  strengths: z.array(z.string()).min(1),
  weaknesses: z.array(z.string()).min(1),
  risks: z.array(z.string()).min(1),
  assumptions: z.array(z.string()).min(1),
  score: z.number().min(0).max(10),
  recommendation: z.enum(["proceed", "refine", "reject"]),
  reasoningSummary: z.string().min(1),
});

export type CritiqueOutput = z.infer<typeof CritiqueOutputSchema>;
