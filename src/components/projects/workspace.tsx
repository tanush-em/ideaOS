"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  GitBranch,
  Lightbulb,
  BarChart3,
} from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { IdeaIntakeForm } from "@/components/ideas/idea-intake-form";
import { PipelineStages } from "@/components/agents/pipeline-stages";
import { BrainstormPanel } from "@/components/agents/brainstorm-panel";
import { PipelineRunPanel } from "@/components/agents/pipeline-run-panel";
import { BlueprintView } from "@/components/agents/blueprint-view";
import { AgentRunDrawer } from "@/components/agents/agent-run-drawer";
import { BranchDialog } from "@/components/projects/branch-dialog";
import { IdeaGraph } from "@/components/graph/idea-graph";
import { ComparisonPanel } from "@/components/projects/comparison-panel";
import type { AgentRun, Idea, PipelineRun, Project, PipelineStage } from "@/types/database";
import type { ProviderInfo } from "@/providers/llm/types";
import type { BrainstormOutput } from "@/schemas/brainstorm";
import type { BlueprintOutput } from "@/schemas/blueprint";
import type { MarketAnalystOutput } from "@/schemas/market_analyst";
import type { EvidenceItem } from "@/schemas/web_scout";
import { BlueprintOutputSchema } from "@/schemas/blueprint";
import { BrainstormOutputSchema } from "@/schemas/brainstorm";
import { MarketAnalystOutputSchema } from "@/schemas/market_analyst";
import { WebScoutOutputSchema } from "@/schemas/web_scout";

interface WorkspaceProps {
  project: Project;
  ideas: Idea[];
  rootIdea: Idea;
  initialRuns: AgentRun[];
  brainstormOutput: BrainstormOutput | null;
  blueprintOutput: BlueprintOutput | null;
  marketScores: MarketAnalystOutput["scores"] | null;
  initialPipelineRun: PipelineRun | null;
  providers: ProviderInfo[];
  userEmail?: string | null;
  webEvidenceCount: number | null;
  webTopEvidence: EvidenceItem[] | null;
}

const STAGE_ORDER: PipelineStage[] = [
  "intake",
  "brainstorm",
  "expansion",
  "critic",
  "web_scout",
  "market_analyst",
  "refiner",
  "blueprint",
];

function resolveCurrentStage(
  ideaStage: PipelineStage,
  runs: AgentRun[]
): PipelineStage {
  const completedStages = new Set(
    runs.filter((r) => r.status === "completed").map((r) => r.stage)
  );
  if (completedStages.has("blueprint")) return "blueprint";
  for (let i = STAGE_ORDER.length - 1; i >= 0; i--) {
    if (completedStages.has(STAGE_ORDER[i])) return STAGE_ORDER[i];
  }
  return ideaStage;
}

export function Workspace({
  project,
  ideas,
  rootIdea,
  initialRuns,
  brainstormOutput: initialBrainstorm,
  blueprintOutput: initialBlueprint,
  marketScores,
  initialPipelineRun,
  providers,
  userEmail,
  webEvidenceCount,
  webTopEvidence,
}: WorkspaceProps) {
  const [activeIdeaId, setActiveIdeaId] = useState(rootIdea.id);
  const activeIdea = useMemo(
    () => ideas.find((i) => i.id === activeIdeaId) ?? rootIdea,
    [ideas, activeIdeaId, rootIdea]
  );

  const [rawInput, setRawInput] = useState(activeIdea.raw_input ?? "");
  const [runs, setRuns] = useState<AgentRun[]>(initialRuns);
  const [brainstormOutput, setBrainstormOutput] = useState(initialBrainstorm);
  const [blueprintOutput, setBlueprintOutput] = useState(initialBlueprint);
  const [marketScoresState, setMarketScoresState] = useState(marketScores);
  const [pipelineRun, setPipelineRun] = useState(initialPipelineRun);
  const [webEvidenceCountState, setWebEvidenceCountState] = useState(
    webEvidenceCount
  );
  const [webTopEvidenceState, setWebTopEvidenceState] = useState(
    webTopEvidence
  );
  const [selectedRun, setSelectedRun] = useState<AgentRun | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [runningStage, setRunningStage] = useState<PipelineStage | null>(null);
  const [currentStage, setCurrentStage] = useState(
    resolveCurrentStage(activeIdea.current_stage, initialRuns)
  );

  const branches = ideas.filter((i) => i.parent_id);

  const refreshForActiveIdea = useCallback(
    async (ideaId: string) => {
      const [runsRes, pipelineRes] = await Promise.all([
        fetch(`/api/ideas/${ideaId}/runs`),
        fetch(`/api/ideas/${ideaId}/pipeline`),
      ]);

      if (runsRes.ok) {
        const runData: AgentRun[] = await runsRes.json();
        setRuns(runData);

        const ideaForStage =
          ideas.find((i) => i.id === ideaId) ?? rootIdea;
        setCurrentStage(resolveCurrentStage(ideaForStage.current_stage, runData));

        const brainstormRun = runData.find(
          (r) => r.stage === "brainstorm" && r.status === "completed"
        );
        if (brainstormRun?.output) {
          const parsed = BrainstormOutputSchema.safeParse(brainstormRun.output);
          if (parsed.success) setBrainstormOutput(parsed.data);
        }

        const blueprintRun = runData.find(
          (r) => r.stage === "blueprint" && r.status === "completed"
        );
        if (blueprintRun?.output) {
          const parsed = BlueprintOutputSchema.safeParse(blueprintRun.output);
          if (parsed.success) setBlueprintOutput(parsed.data);
        }

        const marketRun = runData.find(
          (r) =>
            r.stage === "market_analyst" && r.status === "completed"
        );
        if (marketRun?.output) {
          const parsed = MarketAnalystOutputSchema.safeParse(marketRun.output);
          if (parsed.success) setMarketScoresState(parsed.data.scores);
        } else {
          setMarketScoresState(null);
        }

        const webRun = runData.find(
          (r) => r.stage === "web_scout" && r.status === "completed"
        );
        if (webRun?.output) {
          const parsed = WebScoutOutputSchema.safeParse(webRun.output);
          if (parsed.success) {
            setWebEvidenceCountState(parsed.data.evidence.length);
            setWebTopEvidenceState(parsed.data.evidence.slice(0, 3));
          }
        } else {
          setWebEvidenceCountState(null);
          setWebTopEvidenceState(null);
        }
      }

      if (pipelineRes.ok) {
        const pipelineData = await pipelineRes.json();
        setPipelineRun(pipelineData);
      }

      setRunningStage(null);
    },
    [ideas, rootIdea]
  );

  useEffect(() => {
    // Keep raw input aligned to the selected idea.
    setRawInput(activeIdea.raw_input ?? "");

    if (activeIdeaId === rootIdea.id) {
      setRuns(initialRuns);
      setBrainstormOutput(initialBrainstorm);
      setBlueprintOutput(initialBlueprint);
      setMarketScoresState(marketScores);
      setPipelineRun(initialPipelineRun);
      setWebEvidenceCountState(webEvidenceCount);
      setWebTopEvidenceState(webTopEvidence);
      setCurrentStage(resolveCurrentStage(rootIdea.current_stage, initialRuns));
      setRunningStage(null);
      return;
    }

    refreshForActiveIdea(activeIdeaId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdeaId]);

  const handleBrainstormComplete = () => refreshForActiveIdea(activeIdeaId);
  const handleBrainstormStart = () => setRunningStage("brainstorm");

  const handleRunClick = (run: AgentRun) => {
    setSelectedRun(run);
    setDrawerOpen(true);
  };

  const criticRun = runs.find(
    (r) => r.stage === "critic" && r.status === "completed"
  );
  const criticScore =
    criticRun?.output &&
    typeof criticRun.output === "object" &&
    "score" in criticRun.output
      ? Number(criticRun.output.score)
      : null;

  const evaluation = useMemo(() => {
    const completed = runs.filter((r) => r.status === "completed");
    const validationRuns = completed.filter((r) => r.validation_passed != null);
    const validCount = validationRuns.filter((r) => r.validation_passed);
    const schemaValidityRate =
      validationRuns.length === 0 ? null : validCount.length / validationRuns.length;

    const failedCount = runs.filter((r) => r.status === "failed").length;
    const totalCost = completed.reduce(
      (sum, r) => sum + (r.estimated_cost ?? 0),
      0
    );

    return { schemaValidityRate, failedCount, totalCost, completedCount: completed.length };
  }, [runs]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader userEmail={userEmail} />

      <div className="border-b border-border/40 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">{project.name}</h1>
            {project.description && (
              <p className="truncate text-sm text-muted-foreground">
                {project.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[1600px] flex-1 grid-cols-1 lg:grid-cols-12">
        <aside className="border-b border-border/40 p-4 lg:col-span-3 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2 text-sm font-medium">
            <GitBranch className="size-4 text-primary" />
            Idea graph
          </div>
          <div className="mt-4 space-y-2">
            <IdeaGraph
              rootIdeaId={rootIdea.id}
              ideas={ideas}
              activeIdeaId={activeIdeaId}
              onSelect={(id) => setActiveIdeaId(id)}
            />

            <div className="mt-3">
              <BranchDialog
                ideaId={activeIdeaId}
                branchCount={branches.length}
              />
            </div>
          </div>
        </aside>

        <main className="border-b border-border/40 p-4 lg:col-span-6 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Lightbulb className="size-4 text-primary" />
            Current idea
          </div>

          <div className="mt-4 space-y-6 rounded-xl border border-border/60 bg-card/50 p-6">
            <PipelineRunPanel
              ideaId={activeIdeaId}
              rawInput={rawInput}
              providers={providers}
              initialPipelineRun={pipelineRun}
              onPipelineUpdate={() => refreshForActiveIdea(activeIdeaId)}
              onRunningStageChange={setRunningStage}
            />

            <Separator />

            <IdeaIntakeForm
              ideaId={activeIdeaId}
              initialValue={rawInput}
              onSaved={setRawInput}
            />

            <Separator />

            <BrainstormPanel
              ideaId={activeIdeaId}
              rawInput={rawInput}
              providers={providers}
              existingOutput={brainstormOutput}
              onComplete={handleBrainstormComplete}
              onStart={handleBrainstormStart}
            />

            {blueprintOutput && (
              <>
                <Separator />
                <BlueprintView blueprint={blueprintOutput} />
              </>
            )}

            <Separator />

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Agent pipeline
              </p>
              <PipelineStages
                currentStage={currentStage}
                runs={runs}
                runningStage={runningStage}
                onRunClick={handleRunClick}
              />
            </div>

            {branches.length > 0 && (
              <>
                <Separator />
                <ComparisonPanel ideas={ideas} rootIdeaId={rootIdea.id} />
              </>
            )}
          </div>
        </main>

        <aside className="p-4 lg:col-span-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <BarChart3 className="size-4 text-primary" />
            Insights
          </div>
          <div className="mt-4 space-y-3">
            {[
              {
                label: "Market",
                value: marketScoresState
                  ? `${marketScoresState.marketOpportunity}/10`
                  : "—",
              },
              {
                label: "Feasibility",
                value: marketScoresState
                  ? `${marketScoresState.feasibility}/10`
                  : "—",
              },
              {
                label: "Competition",
                value: marketScoresState
                  ? `${marketScoresState.competition}/10`
                  : "—",
              },
              {
                label: "Evidence",
                value:
                  webEvidenceCountState != null
                    ? `${webEvidenceCountState} items`
                    : "—",
              },
              {
                label: "Critic score",
                value: criticScore != null ? `${criticScore}/10` : "—",
              },
              {
                label: "Candidates",
                value: brainstormOutput
                  ? `${brainstormOutput.candidates.length} ideas`
                  : "—",
              },
            ].map((metric) => (
              <div
                key={metric.label}
                className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2 text-sm"
              >
                <span className="text-muted-foreground">{metric.label}</span>
                <span className="font-medium">{metric.value}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-border/40 bg-card/50 p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Evaluation (quick)
            </p>
            <div className="mt-3 grid gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Schema validity</span>
                <span className="font-mono">
                  {evaluation.schemaValidityRate == null
                    ? "—"
                    : `${Math.round(evaluation.schemaValidityRate * 100)}%`}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Runs (completed)</span>
                <span className="font-mono">{evaluation.completedCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Runs (failed)</span>
                <span className="font-mono">{evaluation.failedCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Agent cost (est.)</span>
                <span className="font-mono">${evaluation.totalCost.toFixed(4)}</span>
              </div>
            </div>
          </div>

          {pipelineRun?.status === "completed" && pipelineRun.total_cost != null && (
            <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
              <p className="text-muted-foreground">Pipeline cost</p>
              <p className="font-mono font-medium">
                ${Number(pipelineRun.total_cost).toFixed(4)}
              </p>
            </div>
          )}

          {runs.length > 0 && (
            <div className="mt-6 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Recent runs
              </p>
              {runs.slice(0, 8).map((run) => (
                <button
                  key={run.id}
                  type="button"
                  onClick={() => handleRunClick(run)}
                  className="w-full rounded-lg border border-border/40 px-3 py-2 text-left text-sm transition-colors hover:border-primary/30 hover:bg-muted/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="capitalize">{run.agent_name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {run.status}
                    </Badge>
                  </div>
                  {run.estimated_cost != null && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      ${Number(run.estimated_cost).toFixed(4)} · {run.latency_ms}ms
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}

          <p className="mt-4 text-xs text-muted-foreground">
            Web Scout evidence is stored in Supabase and used by Market Analyst.
          </p>

              {webTopEvidenceState && webTopEvidenceState.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Top evidence
              </p>
              <div className="space-y-2">
                {webTopEvidenceState.map((e) => (
                  <div
                    key={`${e.sourceUrl}-${e.claim}`}
                    className="rounded-lg border border-border/40 px-3 py-2 text-sm"
                  >
                    <p className="text-xs text-muted-foreground">Claim</p>
                    <p className="mt-1 leading-relaxed">{e.claim}</p>
                    <a
                      href={e.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 block text-xs text-primary hover:underline"
                    >
                      Source
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      <AgentRunDrawer
        run={selectedRun}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
