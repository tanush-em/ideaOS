import { z } from "zod";

export const ExpansionOutputSchema = z.object({
  selectedCandidateTitle: z.string().min(1),
  userPersonas: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      painPoints: z.array(z.string()),
    })
  ),
  workflows: z.array(z.string()).min(1),
  useCases: z.array(z.string()).min(1),
  monetizationOptions: z.array(z.string()).min(1),
  mvpFeatures: z.array(z.string()).min(1),
  assumptions: z.array(z.string()).min(1),
  risks: z.array(z.string()).min(1),
  reasoningSummary: z.string().min(1),
});

export type ExpansionOutput = z.infer<typeof ExpansionOutputSchema>;
