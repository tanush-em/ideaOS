"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProviderSelect } from "./provider-select";
import type { ProviderInfo, ProviderName } from "@/providers/llm/types";
import type { BrainstormOutput } from "@/schemas/brainstorm";

interface BrainstormPanelProps {
  ideaId: string;
  rawInput: string;
  providers: ProviderInfo[];
  existingOutput?: BrainstormOutput | null;
  onComplete: () => void;
  onStart?: () => void;
}

export function BrainstormPanel({
  ideaId,
  rawInput,
  providers,
  existingOutput,
  onComplete,
  onStart,
}: BrainstormPanelProps) {
  const available = providers.filter((p) => p.available);
  const [provider, setProvider] = useState<ProviderName>(
    available[0]?.name ?? "openai"
  );
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<BrainstormOutput | null>(
    existingOutput ?? null
  );

  async function runBrainstorm() {
    if (!rawInput || rawInput.length < 10) {
      toast.error("Describe your idea first (at least 10 characters)");
      return;
    }

    setLoading(true);
    onStart?.();
    try {
      const res = await fetch("/api/agents/brainstorm", {
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
        throw new Error(data.error ?? "Brainstorm failed");
      }

      if (data.output) {
        setOutput(data.output as BrainstormOutput);
      }
      toast.success("Brainstorm complete");
      onComplete();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Brainstorm failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium">Run Brainstorm Agent</p>
          <p className="text-xs text-muted-foreground">
            Generates 3–5 distinct product directions from your idea.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <ProviderSelect
            providers={providers}
            value={provider}
            onChange={(v) => setProvider(v as ProviderName)}
            disabled={loading}
          />
          <Button onClick={runBrainstorm} disabled={loading || available.length === 0}>
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {loading ? "Running…" : output ? "Re-run" : "Run Brainstorm"}
          </Button>
        </div>
      </div>

      {output && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{output.reasoningSummary}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {output.candidates.map((candidate, i) => (
              <Card key={i} className="border-border/60 bg-background/50">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{candidate.title}</CardTitle>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      #{i + 1}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-muted-foreground">{candidate.problem}</p>
                  <p>{candidate.solution}</p>
                  <div className="flex flex-wrap gap-1">
                    {candidate.targetUsers.map((u) => (
                      <Badge key={u} variant="secondary" className="text-[10px]">
                        {u}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-primary">{candidate.valueProposition}</p>
                  <p className="text-xs text-muted-foreground">
                    ↳ {candidate.differentiator}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
