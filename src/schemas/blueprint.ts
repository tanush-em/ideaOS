import { z } from "zod";

export const BlueprintOutputSchema = z.object({
  productName: z.string().min(1),
  problem: z.string().min(1),
  targetUsers: z.array(z.string()).min(1),
  valueProposition: z.string().min(1),
  targetMarket: z.string().min(1),
  competitors: z.array(z.string()),
  marketGaps: z.array(z.string()).min(1),
  differentiation: z.string().min(1),
  coreFeatures: z.array(z.string()).min(1),
  userFlows: z.array(z.string()).min(1),
  mvpScope: z.array(z.string()).min(1),
  futureFeatures: z.array(z.string()),
  pricing: z.string().min(1),
  monetization: z.string().min(1),
  acquisition: z.string().min(1),
  retention: z.string().min(1),
  techStack: z.object({
    frontend: z.string(),
    backend: z.string(),
    database: z.string(),
    aiArchitecture: z.string(),
    externalApis: z.array(z.string()),
    infrastructure: z.string(),
  }),
  milestones: z.array(
    z.object({
      name: z.string(),
      duration: z.string(),
      deliverables: z.array(z.string()),
    })
  ).min(1),
  risks: z.array(z.string()).min(1),
  killCriteria: z.array(z.string()).min(1),
  recommendation: z.enum(["proceed", "refine", "reject"]),
  reasoningSummary: z.string().min(1),
});

export type BlueprintOutput = z.infer<typeof BlueprintOutputSchema>;
