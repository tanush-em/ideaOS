"use client";

import { Check, Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AgentRun, PipelineStage } from "@/types/database";

const STAGES: { id: PipelineStage; label: string }[] = [
  { id: "intake", label: "Intake" },
  { id: "brainstorm", label: "Brainstorm" },
  { id: "expansion", label: "Expansion" },
  { id: "critic", label: "Critic" },
  { id: "web_scout", label: "Web Scout" },
  { id: "market_analyst", label: "Market Analyst" },
  { id: "refiner", label: "Refiner" },
  { id: "blueprint", label: "Blueprint" },
];

interface PipelineStagesProps {
  currentStage: PipelineStage;
  runs: AgentRun[];
  runningStage?: PipelineStage | null;
  onRunClick?: (run: AgentRun) => void;
}

export function PipelineStages({
  currentStage,
  runs,
  runningStage,
  onRunClick,
}: PipelineStagesProps) {
  const runsByStage = new Map<PipelineStage, AgentRun>();
  for (const run of runs) {
    const existing = runsByStage.get(run.stage);
    if (!existing || run.created_at > existing.created_at) {
      runsByStage.set(run.stage, run);
    }
  }

  const currentIndex = STAGES.findIndex((s) => s.id === currentStage);

  return (
    <div className="space-y-1">
      {STAGES.map((stage, i) => {
        const run = runsByStage.get(stage.id);
        const isRunning = runningStage === stage.id;
        const isComplete = run?.status === "completed";
        const isFailed = run?.status === "failed";
        const isStub =
          isComplete && run?.provider === "stub";
        const isFuture =
          !isComplete && !isRunning && !isFailed && i > currentIndex;

        return (
          <button
            key={stage.id}
            type="button"
            disabled={!run || isRunning}
            onClick={() => run && onRunClick?.(run)}
            className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/50 disabled:cursor-default disabled:hover:bg-transparent"
          >
            <StageIcon
              complete={isComplete}
              running={isRunning}
              failed={isFailed}
              index={i + 1}
            />
            <span
              className={
                isComplete || isRunning
                  ? "text-foreground"
                  : "text-muted-foreground"
              }
            >
              {stage.label}
              {isStub && (
                <span className="ml-1 text-[10px] text-muted-foreground">
                  (stub)
                </span>
              )}
            </span>
            <Badge
              variant={
                isFailed
                  ? "destructive"
                  : isComplete
                    ? "default"
                    : isRunning
                      ? "secondary"
                      : "outline"
              }
              className="ml-auto text-[10px]"
            >
              {isFailed
                ? "failed"
                : isComplete
                  ? isStub
                    ? "stubbed"
                    : "done"
                  : isRunning
                    ? "running"
                    : "pending"}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}

function StageIcon({
  complete,
  running,
  failed,
  index,
}: {
  complete: boolean;
  running: boolean;
  failed: boolean;
  index: number;
}) {
  if (running) {
    return (
      <span className="flex size-5 items-center justify-center">
        <Loader2 className="size-4 animate-spin text-primary" />
      </span>
    );
  }
  if (failed) {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-destructive/20">
        <X className="size-3 text-destructive" />
      </span>
    );
  }
  if (complete) {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-primary/20">
        <Check className="size-3 text-primary" />
      </span>
    );
  }
  return (
    <span className="flex size-5 items-center justify-center rounded-full border border-border text-[10px] text-muted-foreground">
      {index}
    </span>
  );
}
