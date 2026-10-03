"use client";

import { FileText, Rocket } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import type { BlueprintOutput } from "@/schemas/blueprint";

interface BlueprintViewProps {
  blueprint: BlueprintOutput;
}

export function BlueprintView({ blueprint }: BlueprintViewProps) {
  function toMarkdown(b: BlueprintOutput): string {
    return [
      `# ${b.productName}`,
      ``,
      `**Value proposition:** ${b.valueProposition}`,
      ``,
      `## Problem`,
      b.problem,
      ``,
      `## Target users`,
      ...b.targetUsers.map((u) => `- ${u}`),
      ``,
      `## Target market`,
      b.targetMarket,
      ``,
      `## Differentiation`,
      b.differentiation,
      ``,
      `## Market gaps`,
      ...b.marketGaps.map((g) => `- ${g}`),
      ``,
      `## Competitors`,
      ...(b.competitors.length ? b.competitors.map((c) => `- ${c}`) : ["- (none)"]),
      ``,
      `## Core features`,
      ...b.coreFeatures.map((f) => `- ${f}`),
      ``,
      `## User flows`,
      ...b.userFlows.map((f) => `- ${f}`),
      ``,
      `## MVP scope`,
      ...b.mvpScope.map((f) => `- ${f}`),
      ``,
      `## Pricing`,
      b.pricing,
      ``,
      `## Monetization`,
      b.monetization,
      ``,
      `## Acquisition`,
      b.acquisition,
      ``,
      `## Retention`,
      b.retention,
      ``,
      `## Tech stack`,
      `- Frontend: ${b.techStack.frontend}`,
      `- Backend: ${b.techStack.backend}`,
      `- Database: ${b.techStack.database}`,
      `- AI architecture: ${b.techStack.aiArchitecture}`,
      ...(b.techStack.externalApis.length
        ? [`- External APIs: ${b.techStack.externalApis.join(", ")}`]
        : []),
      `- Infrastructure: ${b.techStack.infrastructure}`,
      ``,
      `## Milestones`,
      ...b.milestones.flatMap((m) => [
        `### ${m.name} (${m.duration})`,
        ...m.deliverables.map((d) => `- ${d}`),
        ``,
      ]),
      `## Risks`,
      ...b.risks.map((r) => `- ${r}`),
      ``,
      `## Kill criteria`,
      ...b.killCriteria.map((k) => `- ${k}`),
      ``,
      `## Recommendation`,
      b.recommendation,
      ``,
      `## Reasoning summary`,
      b.reasoningSummary,
      ``,
    ].join("\n");
  }

  async function handleExport() {
    const md = toMarkdown(blueprint);

    try {
      await navigator.clipboard.writeText(md);
      toast.success("Blueprint markdown copied to clipboard");
    } catch {
      // Fallback: download if clipboard is blocked
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${blueprint.productName.replace(/\\s+/g, "-").toLowerCase()}-blueprint.md`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Blueprint markdown downloaded");
    }
  }

  return (
    <Card className="border-primary/20 bg-card/80">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <FileText className="size-5 text-primary" />
              {blueprint.productName}
            </CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              {blueprint.valueProposition}
            </p>
          </div>
          <Badge
            variant={
              blueprint.recommendation === "proceed"
                ? "default"
                : blueprint.recommendation === "reject"
                  ? "destructive"
                  : "secondary"
            }
          >
            {blueprint.recommendation}
          </Badge>
        </div>
        <div className="mt-3 flex items-center justify-end">
          <Button variant="outline" onClick={handleExport}>
            Export Markdown
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 text-sm">
        <Section title="Problem" content={blueprint.problem} />
        <Section
          title="Target users"
          items={blueprint.targetUsers}
        />
        <Section title="Target market" content={blueprint.targetMarket} />
        <Section title="Differentiation" content={blueprint.differentiation} />
        <Section title="Market gaps" items={blueprint.marketGaps} />
        {blueprint.competitors.length > 0 && (
          <Section title="Competitors" items={blueprint.competitors} />
        )}

        <Separator />

        <Section title="Core features" items={blueprint.coreFeatures} />
        <Section title="MVP scope" items={blueprint.mvpScope} />
        <Section title="User flows" items={blueprint.userFlows} />
        {blueprint.futureFeatures.length > 0 && (
          <Section title="Future features" items={blueprint.futureFeatures} />
        )}

        <Separator />

        <div className="grid gap-4 sm:grid-cols-2">
          <Section title="Pricing" content={blueprint.pricing} />
          <Section title="Monetization" content={blueprint.monetization} />
          <Section title="Acquisition" content={blueprint.acquisition} />
          <Section title="Retention" content={blueprint.retention} />
        </div>

        <Separator />

        <div>
          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Tech stack
          </h4>
          <div className="grid gap-2 sm:grid-cols-2 text-sm">
            <p><span className="text-muted-foreground">Frontend:</span> {blueprint.techStack.frontend}</p>
            <p><span className="text-muted-foreground">Backend:</span> {blueprint.techStack.backend}</p>
            <p><span className="text-muted-foreground">Database:</span> {blueprint.techStack.database}</p>
            <p><span className="text-muted-foreground">AI:</span> {blueprint.techStack.aiArchitecture}</p>
            <p><span className="text-muted-foreground">Infra:</span> {blueprint.techStack.infrastructure}</p>
          </div>
          {blueprint.techStack.externalApis.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {blueprint.techStack.externalApis.map((api) => (
                <Badge key={api} variant="outline" className="text-[10px]">
                  {api}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div>
          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1">
            <Rocket className="size-3" />
            Milestones
          </h4>
          <div className="space-y-3">
            {blueprint.milestones.map((m, i) => (
              <div key={i} className="rounded-lg border border-border/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{m.name}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {m.duration}
                  </Badge>
                </div>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  {m.deliverables.map((d) => (
                    <li key={d} className="text-xs">• {d}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <Section title="Risks" items={blueprint.risks} />
        <Section title="Kill criteria" items={blueprint.killCriteria} />

        <p className="text-xs text-muted-foreground border-t border-border/40 pt-4">
          {blueprint.reasoningSummary}
        </p>
      </CardContent>
    </Card>
  );
}

function Section({
  title,
  content,
  items,
}: {
  title: string;
  content?: string;
  items?: string[];
}) {
  return (
    <div>
      <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
        {title}
      </h4>
      {content && <p>{content}</p>}
      {items && (
        <ul className="space-y-1 text-muted-foreground">
          {items.map((item) => (
            <li key={item} className="text-sm">• {item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
