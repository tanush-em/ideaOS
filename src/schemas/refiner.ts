import { z } from "zod";

export const RefinerOutputSchema = z.object({
  refinedTitle: z.string().min(1),
  refinedProblem: z.string().min(1),
  refinedSolution: z.string().min(1),
  targetUsers: z.array(z.string()).min(1),
  valueProposition: z.string().min(1),
  differentiator: z.string().min(1),
  mvpScope: z.array(z.string()).min(1),
  killCriteria: z.array(z.string()).min(1),
  keyChanges: z.array(z.string()).min(1),
  reasoningSummary: z.string().min(1),
});

export type RefinerOutput = z.infer<typeof RefinerOutputSchema>;
