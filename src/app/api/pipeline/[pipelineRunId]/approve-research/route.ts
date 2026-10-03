import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  continuePipelineFromResearch,
  executePipeline,
} from "@/orchestration/pipeline";
import type { ProviderName } from "@/providers/llm/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ pipelineRunId: string }> }
) {
  const { pipelineRunId } = await params;
  const body = await request.json().catch(() => ({}));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: pipelineRun, error } = await supabase
    .from("pipeline_runs")
    .select("*")
    .eq("id", pipelineRunId)
    .eq("user_id", user.id)
    .single();

  if (error || !pipelineRun) {
    return NextResponse.json({ error: "Pipeline run not found" }, { status: 404 });
  }

  if (pipelineRun.status !== "awaiting_research_approval") {
    return NextResponse.json(
      { error: "Pipeline is not awaiting research approval" },
      { status: 409 }
    );
  }

  // Optionally override provider
  const provider = (body.provider as ProviderName | undefined) ?? pipelineRun.provider ?? null;

  const { data: idea } = await supabase
    .from("ideas")
    .select("*")
    .eq("id", pipelineRun.idea_id)
    .single();

  if (!idea) {
    return NextResponse.json({ error: "Idea not found" }, { status: 404 });
  }

  await continuePipelineFromResearch({
    supabase,
    pipelineRunId,
    ideaId: pipelineRun.idea_id,
    projectId: pipelineRun.project_id,
    userId: user.id,
    rawInput: idea.raw_input ?? "",
    provider,
  });

  // Fetch latest pipeline run state to return
  const { data: updated } = await supabase
    .from("pipeline_runs")
    .select("*")
    .eq("id", pipelineRunId)
    .eq("user_id", user.id)
    .single();

  return NextResponse.json(updated);
}

