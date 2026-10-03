"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Play, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProviderSelect } from "./provider-select";
import type { ProviderInfo, ProviderName } from "@/providers/llm/types";
import type { PipelineRun, PipelineStage } from "@/types/database";

const STAGE_LABELS: Record<PipelineStage, string> = {
  intake: "Intake",
  brainstorm: "Brainstorm",
  expansion: "Expansion",
  critic: "Critic",
  web_scout: "Web Scout",
  market_analyst: "Market Analyst",
  refiner: "Refiner",
  evaluator: "Evaluator",
  blueprint: "Blueprint",
};

interface PipelineRunPanelProps {
  ideaId: string;
  rawInput: string;
  providers: ProviderInfo[];
  initialPipelineRun?: PipelineRun | null;
  onPipelineUpdate: () => void;
  onRunningStageChange?: (stage: PipelineStage | null) => void;
}

export function PipelineRunPanel({
  ideaId,
  rawInput,
  providers,
  initialPipelineRun,
  onPipelineUpdate,
  onRunningStageChange,
}: PipelineRunPanelProps) {
  const available = providers.filter((p) => p.available);
  const [provider, setProvider] = useState<ProviderName>(
    available[0]?.name ?? "openai"
  );
  const [pipelineRun, setPipelineRun] = useState<PipelineRun | null>(
    initialPipelineRun ?? null
  );
  const [starting, setStarting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isRunning = pipelineRun?.status === "running";
  const awaitingApproval =
    pipelineRun?.status === "awaiting_research_approval";

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollPipeline = useCallback(
    async (runId: string) => {
      const res = await fetch(`/api/pipeline/${runId}`);
      if (!res.ok) return;

      const data = await res.json();
      setPipelineRun(data.pipeline_run);

      if (data.pipeline_run.status === "running") {
        onRunningStageChange?.(data.pipeline_run.current_stage);
      }

      if (
        data.pipeline_run.status === "completed" ||
        data.pipeline_run.status === "failed"
      ) {
        stopPolling();
        onRunningStageChange?.(null);
        onPipelineUpdate();

        if (data.pipeline_run.status === "completed") {
          toast.success(
            `Pipeline complete · $${Number(data.pipeline_run.total_cost ?? 0).toFixed(4)}`
          );
        } else {
          toast.error(data.pipeline_run.error ?? "Pipeline failed");
        }
      }

      if (data.pipeline_run.status === "awaiting_research_approval") {
        stopPolling();
        onRunningStageChange?.(data.pipeline_run.current_stage ?? null);
      }
    },
    [onPipelineUpdate, onRunningStageChange, stopPolling]
  );

  const startPolling = useCallback(
    (runId: string) => {
      stopPolling();
      pollRef.current = setInterval(() => pollPipeline(runId), 2000);
      pollPipeline(runId);
    },
    [pollPipeline, stopPolling]
  );

  useEffect(() => {
    if (initialPipelineRun?.status === "running") {
      setPipelineRun(initialPipelineRun);
      startPolling(initialPipelineRun.id);
      onRunningStageChange?.(initialPipelineRun.current_stage);
    }
    return () => stopPolling();
  }, [initialPipelineRun, startPolling, stopPolling, onRunningStageChange]);

  async function runPipeline() {
    if (!rawInput || rawInput.length < 10) {
      toast.error("Describe your idea first (at least 10 characters)");
      return;
    }

    setStarting(true);
    try {
      const res = await fetch("/api/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea_id: ideaId,
          raw_input: rawInput,
          provider,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data.pipeline_run_id) {
          startPolling(data.pipeline_run_id);
          return;
        }
        throw new Error(data.error ?? "Failed to start pipeline");
      }

      setPipelineRun(data);
      onRunningStageChange?.("intake");
      startPolling(data.id);
      toast.info("Pipeline started — agents are running");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start");
    } finally {
      setStarting(false);
    }
  }

  async function approveResearch() {
    if (!pipelineRun) return;
    setStarting(true);
    try {
      const res = await fetch(
        `/api/pipeline/${pipelineRun.id}/approve-research`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider }),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to approve research");
      }

      setPipelineRun(data);
      // Continue polling because the remainder stages may still take time
      onRunningStageChange?.(data.current_stage ?? null);
      startPolling(data.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="rounded-xl border border-border/60 bg-gradient-to-br from-primary/5 to-transparent p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="size-4 text-primary" />
            <p className="font-medium">Full agent pipeline</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Intake → Brainstorm → Expansion → Critic → Refiner → Blueprint
            (research stubbed)
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <ProviderSelect
            providers={providers}
            value={provider}
            onChange={(v) => setProvider(v as ProviderName)}
            disabled={isRunning || starting}
          />
          {awaitingApproval ? (
            <Button onClick={approveResearch} disabled={starting || isRunning}>
              {starting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Play className="size-4" />
              )}
              Start web research
            </Button>
          ) : (
            <Button
              onClick={runPipeline}
              disabled={starting || isRunning || available.length === 0}
            >
              {starting || isRunning ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Play className="size-4" />
              )}
              {isRunning ? "Running…" : "Run pipeline"}
            </Button>
          )}
        </div>
      </div>

      {pipelineRun && (
        <div className="mt-4 space-y-2 rounded-lg border border-border/40 bg-background/50 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge
              variant={
                pipelineRun.status === "completed"
                  ? "default"
                  : pipelineRun.status === "failed"
                    ? "destructive"
                    : pipelineRun.status === "awaiting_research_approval"
                      ? "secondary"
                    : "secondary"
              }
            >
              {pipelineRun.status}
            </Badge>
          </div>
          {(isRunning || awaitingApproval) && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current stage</span>
              <span className="font-medium">
                {STAGE_LABELS[pipelineRun.current_stage]}
              </span>
            </div>
          )}
          {pipelineRun.total_cost != null && pipelineRun.status === "completed" && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total cost</span>
              <span className="font-medium font-mono">
                ${Number(pipelineRun.total_cost).toFixed(4)}
              </span>
            </div>
          )}
          {pipelineRun.error && (
            <p className="text-xs text-destructive">{pipelineRun.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
