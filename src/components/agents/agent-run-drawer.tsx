"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { AgentRun } from "@/types/database";

interface AgentRunDrawerProps {
  run: AgentRun | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatCost(cost: number | null): string {
  if (cost == null) return "—";
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(3)}`;
}

function formatJson(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

export function AgentRunDrawer({
  run,
  open,
  onOpenChange,
}: AgentRunDrawerProps) {
  if (!run) return null;

  const statusVariant =
    run.status === "completed"
      ? "default"
      : run.status === "failed"
        ? "destructive"
        : "secondary";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="capitalize">
            {run.agent_name} Agent Run
          </SheetTitle>
          <SheetDescription className="font-mono text-xs">
            {run.id}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
          <div className="space-y-4 pt-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant={statusVariant}>{run.status}</Badge>
              {run.validation_passed != null && (
                <Badge variant={run.validation_passed ? "default" : "destructive"}>
                  {run.validation_passed ? "Valid schema" : "Invalid schema"}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Metric label="Provider" value={run.provider ?? "—"} />
              <Metric label="Model" value={run.model ?? "—"} />
              <Metric
                label="Latency"
                value={run.latency_ms != null ? `${run.latency_ms}ms` : "—"}
              />
              <Metric label="Cost" value={formatCost(run.estimated_cost)} />
              <Metric
                label="Input tokens"
                value={run.tokens_input?.toString() ?? "—"}
              />
              <Metric
                label="Output tokens"
                value={run.tokens_output?.toString() ?? "—"}
              />
            </div>

            {run.error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {run.error}
              </div>
            )}

            <Separator />

            <Section title="Input">
              <pre className="rounded-lg bg-muted/50 p-3 text-xs overflow-x-auto">
                {formatJson(run.input)}
              </pre>
            </Section>

            {run.output && (
              <Section title="Output">
                <pre className="rounded-lg bg-muted/50 p-3 text-xs overflow-x-auto max-h-96">
                  {formatJson(run.output)}
                </pre>
              </Section>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/40 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium truncate">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}
