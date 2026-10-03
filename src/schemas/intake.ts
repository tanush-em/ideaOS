import { z } from "zod";

export const IdeaIntakeSchema = z.object({
  problem: z.string().min(1),
  targetUsers: z.array(z.string()).min(1),
  domain: z.string().min(1),
  constraints: z.array(z.string()),
  initialHypothesis: z.string().min(1),
});

export type IdeaIntake = z.infer<typeof IdeaIntakeSchema>;
