import { NextResponse } from "next/server";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executePipeline } from "@/orchestration/pipeline";
import type { ProviderName } from "@/providers/llm/types";
import { getAvailableProviders } from "@/providers/llm";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const available = getAvailableProviders().filter((p) => p.available);
  if (available.length === 0) {
    return NextResponse.json(
      { error: "No LLM provider configured. Add an API key to .env.local" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const ideaId = body.idea_id as string;
  const provider = body.provider as ProviderName | undefined;

  if (!ideaId) {
    return NextResponse.json({ error: "idea_id is required" }, { status: 400 });
  }

  const { data: idea, error: ideaError } = await supabase
    .from("ideas")
    .select("*")
    .eq("id", ideaId)
    .eq("user_id", user.id)
    .single();

  if (ideaError || !idea) {
    return NextResponse.json({ error: "Idea not found" }, { status: 404 });
  }

  const rawInput = body.raw_input?.trim() || idea.raw_input?.trim();
  if (!rawInput || rawInput.length < 10) {
    return NextResponse.json(
      { error: "Describe your idea first (at least 10 characters)" },
      { status: 400 }
    );
  }

  // Check for already running pipeline
  const { data: activeRun } = await supabase
    .from("pipeline_runs")
    .select("id")
    .eq("idea_id", ideaId)
    .eq("status", "running")
    .limit(1);

  if (activeRun && activeRun.length > 0) {
    return NextResponse.json(
      { error: "A pipeline is already running for this idea", pipeline_run_id: activeRun[0].id },
      { status: 409 }
    );
  }

  if (rawInput !== idea.raw_input) {
    await supabase
      .from("ideas")
      .update({ raw_input: rawInput })
      .eq("id", ideaId);
  }

  const { data: pipelineRun, error: createError } = await supabase
    .from("pipeline_runs")
    .insert({
      idea_id: ideaId,
      project_id: idea.project_id,
      user_id: user.id,
      status: "running",
      current_stage: "intake",
      provider: provider ?? available[0].name,
    })
    .select()
    .single();

  if (createError || !pipelineRun) {
    return NextResponse.json(
      { error: createError?.message ?? "Failed to start pipeline" },
      { status: 500 }
    );
  }

  // Run pipeline in background after response
  after(async () => {
    const bgSupabase = await createClient();
    await executePipeline({
      supabase: bgSupabase,
      pipelineRunId: pipelineRun.id,
      ideaId,
      projectId: idea.project_id,
      userId: user.id,
      rawInput,
      provider,
    });
  });

  return NextResponse.json(pipelineRun, { status: 202 });
}
