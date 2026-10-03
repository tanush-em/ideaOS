"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function EvaluationRunner() {
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<null | any>(null);

  async function run() {
    setRunning(true);
    try {
      const res = await fetch("/api/evaluations/run", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Benchmark failed");
      setReport(data);
      toast.success("Benchmark complete");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Benchmark failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Evaluations</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Golden benchmark: schema validation for Brainstorm outputs.
              </p>
            </div>
            {report && (
              <Badge variant="secondary">
                Pass rate: {Math.round(report.passRate * 100)}%
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={run} disabled={running}>
            {running ? "Running…" : "Run golden benchmark"}
          </Button>

          {report && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <Metric label="Total tests" value={report.total} />
                <Metric label="Passed" value={report.passed} />
                <Metric label="Avg cost (est.)" value={`$${Number(report.avgCost ?? 0).toFixed(4)}`} />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted-foreground">
                      <th className="text-left py-2 pr-2">#</th>
                      <th className="text-left py-2 pr-2">Pass</th>
                      <th className="text-left py-2 pr-2">Cost (est.)</th>
                      <th className="text-left py-2 pr-2">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.results.map((r: any) => (
                      <tr key={r.idx} className="border-t border-border/40">
                        <td className="py-2 pr-2">{r.idx + 1}</td>
                        <td className="py-2 pr-2">{r.pass ? "✅" : "❌"}</td>
                        <td className="py-2 pr-2 font-mono">${Number(r.estimatedCost).toFixed(4)}</td>
                        <td className="py-2 pr-2 text-muted-foreground">
                          {r.error ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border/40 bg-card/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-sm">{value}</p>
    </div>
  );
}

