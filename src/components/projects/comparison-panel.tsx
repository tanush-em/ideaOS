"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Idea, AgentRun } from "@/types/database";
import type { BlueprintOutput } from "@/schemas/blueprint";
import type { MarketAnalystOutput } from "@/schemas/market_analyst";
import type { EvidenceItem } from "@/schemas/web_scout";
import type { CritiqueOutput } from "@/schemas/critic";

function findRun(runs: AgentRun[], stage: AgentRun["stage"]) {
  return runs.find((r) => r.stage === stage && r.status === "completed");
}

function computeMetrics(runs: AgentRun[]) {
  const critic = findRun(runs, "critic");
  const market = findRun(runs, "market_analyst");
  const web = findRun(runs, "web_scout");
  const blueprint = findRun(runs, "blueprint");

  const criticOutput = critic?.output as unknown as CritiqueOutput | undefined;
  const marketOutput = market?.output as unknown as MarketAnalystOutput | undefined;
  const webOutput = web?.output as unknown as { evidence: EvidenceItem[] } | undefined;
  const blueprintOutput = blueprint?.output as unknown as BlueprintOutput | undefined;

  return {
    criticScore: criticOutput?.score ?? null,
    marketOverall: marketOutput?.scores.overall ?? null,
    feasibility: marketOutput?.scores.feasibility ?? null,
    competition: marketOutput?.scores.competition ?? null,
    differentiation: marketOutput?.scores.differentiation ?? null,
    monetization: marketOutput?.scores.monetization ?? null,
    evidenceCount: webOutput?.evidence?.length ?? null,
    blueprintRecommendation: blueprintOutput?.recommendation ?? null,
  };
}

export function ComparisonPanel({
  ideas,
  rootIdeaId,
}: {
  ideas: Idea[];
  rootIdeaId: string;
}) {
  const branchIdeas = useMemo(() => ideas.filter((i) => i.id === rootIdeaId || i.parent_id === rootIdeaId), [ideas, rootIdeaId]);

  const [leftIdeaId, setLeftIdeaId] = useState(rootIdeaId);
  const [rightIdeaId, setRightIdeaId] = useState(rootIdeaId);

  const [leftRuns, setLeftRuns] = useState<AgentRun[]>([]);
  const [rightRuns, setRightRuns] = useState<AgentRun[]>([]);

  async function loadRuns(ideaId: string, which: "left" | "right") {
    const res = await fetch(`/api/ideas/${ideaId}/runs`);
    if (!res.ok) {
      toast.error("Failed to load runs for comparison");
      return;
    }
    const data: AgentRun[] = await res.json();
    if (which === "left") setLeftRuns(data);
    else setRightRuns(data);
  }

  useEffect(() => {
    if (leftIdeaId) loadRuns(leftIdeaId, "left");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftIdeaId]);

  useEffect(() => {
    if (rightIdeaId) loadRuns(rightIdeaId, "right");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rightIdeaId]);

  const leftMetrics = useMemo(() => computeMetrics(leftRuns), [leftRuns]);
  const rightMetrics = useMemo(() => computeMetrics(rightRuns), [rightRuns]);

  const leftName = branchIdeas.find((i) => i.id === leftIdeaId)?.title ?? "Left";
  const rightName = branchIdeas.find((i) => i.id === rightIdeaId)?.title ?? "Right";

  return (
    <div className="rounded-xl border border-border/60 bg-card/50 p-4">
      <p className="text-sm font-medium">Branch comparison</p>
      <p className="mt-1 text-xs text-muted-foreground">Compare critic + evidence + market scores (based on saved runs).</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Select value={leftIdeaId} onValueChange={setLeftIdeaId}>
          <SelectTrigger>
            <SelectValue placeholder="Select left branch" />
          </SelectTrigger>
          <SelectContent>
            {branchIdeas.map((i) => (
              <SelectItem key={i.id} value={i.id}>{i.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={rightIdeaId} onValueChange={setRightIdeaId}>
          <SelectTrigger>
            <SelectValue placeholder="Select right branch" />
          </SelectTrigger>
          <SelectContent>
            {branchIdeas.map((i) => (
              <SelectItem key={i.id} value={i.id}>{i.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground">
              <th className="text-left font-medium py-2 pr-2">Metric</th>
              <th className="text-left font-medium py-2 pr-2">{leftName}</th>
              <th className="text-left font-medium py-2">{rightName}</th>
            </tr>
          </thead>
          <tbody>
            <Row label="Market overall" left={leftMetrics.marketOverall} right={rightMetrics.marketOverall} suffix="/10" />
            <Row label="Feasibility" left={leftMetrics.feasibility} right={rightMetrics.feasibility} suffix="/10" />
            <Row label="Competition" left={leftMetrics.competition} right={rightMetrics.competition} suffix="/10" />
            <Row label="Differentiation" left={leftMetrics.differentiation} right={rightMetrics.differentiation} suffix="/10" />
            <Row label="Monetization" left={leftMetrics.monetization} right={rightMetrics.monetization} suffix="/10" />
            <Row label="Critic score" left={leftMetrics.criticScore} right={rightMetrics.criticScore} suffix="/10" />
            <Row label="Evidence items" left={leftMetrics.evidenceCount} right={rightMetrics.evidenceCount} />
            <Row
              label="Blueprint recommendation"
              left={leftMetrics.blueprintRecommendation}
              right={rightMetrics.blueprintRecommendation}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({
  label,
  left,
  right,
  suffix,
}: {
  label: string;
  left: any;
  right: any;
  suffix?: string;
}) {
  const l = left == null ? "—" : `${left}${suffix ?? ""}`;
  const r = right == null ? "—" : `${right}${suffix ?? ""}`;
  return (
    <tr className="border-t border-border/40">
      <td className="py-2 pr-2 font-medium text-muted-foreground">{label}</td>
      <td className="py-2 pr-2">{l}</td>
      <td className="py-2">{r}</td>
    </tr>
  );
}

