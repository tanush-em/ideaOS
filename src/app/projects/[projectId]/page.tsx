import { notFound } from "next/navigation";
import { Workspace } from "@/components/projects/workspace";
import { createClient } from "@/lib/supabase/server";
import { getAvailableProviders } from "@/providers/llm";
import type { AgentRun, Idea, PipelineRun, Project } from "@/types/database";
import type { BrainstormOutput } from "@/schemas/brainstorm";
import { BrainstormOutputSchema } from "@/schemas/brainstorm";
import type { BlueprintOutput } from "@/schemas/blueprint";
import { BlueprintOutputSchema } from "@/schemas/blueprint";
import type { MarketAnalystOutput } from "@/schemas/market_analyst";
import { MarketAnalystOutputSchema } from "@/schemas/market_analyst";
import type { EvidenceItem } from "@/schemas/web_scout";
import { WebScoutOutputSchema } from "@/schemas/web_scout";

async function getProjectData(
  projectId: string,
  userId: string
): Promise<{
  project: Project;
  ideas: Idea[];
  runs: AgentRun[];
  brainstormOutput: BrainstormOutput | null;
  blueprintOutput: BlueprintOutput | null;
  marketScores: MarketAnalystOutput["scores"] | null;
  pipelineRun: PipelineRun | null;
  webEvidenceCount: number | null;
  webTopEvidence: EvidenceItem[] | null;
} | null> {
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", userId)
    .single();

  if (!project) return null;

  const { data: ideas } = await supabase
    .from("ideas")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  const rootIdea = ideas?.find((i) => i.is_root) ?? ideas?.[0];
  let runs: AgentRun[] = [];
  let brainstormOutput: BrainstormOutput | null = null;
  let blueprintOutput: BlueprintOutput | null = null;
  let marketScores: MarketAnalystOutput["scores"] | null = null;
  let pipelineRun: PipelineRun | null = null;
  let webEvidenceCount: number | null = null;
  let webTopEvidence: EvidenceItem[] | null = null;

  if (rootIdea) {
    const { data: runData } = await supabase
      .from("agent_runs")
      .select("*")
      .eq("idea_id", rootIdea.id)
      .order("created_at", { ascending: false });

    runs = runData ?? [];

    const brainstormRun = runs.find(
      (r) => r.stage === "brainstorm" && r.status === "completed"
    );
    if (brainstormRun?.output) {
      const parsed = BrainstormOutputSchema.safeParse(brainstormRun.output);
      if (parsed.success) brainstormOutput = parsed.data;
    }

    const blueprintRun = runs.find(
      (r) => r.stage === "blueprint" && r.status === "completed"
    );
    if (blueprintRun?.output) {
      const parsed = BlueprintOutputSchema.safeParse(blueprintRun.output);
      if (parsed.success) blueprintOutput = parsed.data;
    }

    const marketRun = runs.find(
      (r) => r.stage === "market_analyst" && r.status === "completed"
    );
    if (marketRun?.output) {
      const parsed = MarketAnalystOutputSchema.safeParse(marketRun.output);
      if (parsed.success) marketScores = parsed.data.scores;
    }

    const webScoutRun = runs.find(
      (r) => r.stage === "web_scout" && r.status === "completed"
    );
    if (webScoutRun?.output) {
      const parsed = WebScoutOutputSchema.safeParse(webScoutRun.output);
      if (parsed.success) {
        webEvidenceCount = parsed.data.evidence.length;
        webTopEvidence = parsed.data.evidence.slice(0, 3);
      }
    }

    const { data: pipelineRuns } = await supabase
      .from("pipeline_runs")
      .select("*")
      .eq("idea_id", rootIdea.id)
      .order("created_at", { ascending: false })
      .limit(1);

    pipelineRun = pipelineRuns?.[0] ?? null;
  }

  return {
    project,
    ideas: ideas ?? [],
    runs,
    brainstormOutput,
    blueprintOutput,
    marketScores,
    pipelineRun,
    webEvidenceCount,
    webTopEvidence,
  };
}

export default async function ProjectWorkspacePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const data = await getProjectData(projectId, user.id);
  if (!data) notFound();

  const {
    project,
    ideas,
    runs,
    brainstormOutput,
    blueprintOutput,
    marketScores,
    pipelineRun,
    webEvidenceCount,
    webTopEvidence,
  } = data;
  const rootIdea = ideas.find((i) => i.is_root) ?? ideas[0];
  if (!rootIdea) notFound();

  const providers = getAvailableProviders();

  return (
    <Workspace
      project={project}
      ideas={ideas}
      rootIdea={rootIdea}
      initialRuns={runs}
      brainstormOutput={brainstormOutput}
      blueprintOutput={blueprintOutput}
      marketScores={marketScores}
      initialPipelineRun={pipelineRun}
      providers={providers}
      userEmail={user.email}
      webEvidenceCount={webEvidenceCount}
      webTopEvidence={webTopEvidence}
    />
  );
}
