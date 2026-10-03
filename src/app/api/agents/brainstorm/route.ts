import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runBrainstormAgent } from "@/agents/brainstorm/run";
import { SCHEMA_VERSION } from "@/schemas/brainstorm";
import type { ProviderName } from "@/providers/llm/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  // Persist intake if new
  if (rawInput !== idea.raw_input) {
    await supabase
      .from("ideas")
      .update({ raw_input: rawInput })
      .eq("id", ideaId);
  }

  const { data: run, error: runError } = await supabase
    .from("agent_runs")
    .insert({
      idea_id: ideaId,
      project_id: idea.project_id,
      user_id: user.id,
      agent_name: "brainstorm",
      stage: "brainstorm",
      status: "running",
      input: { raw_input: rawInput, provider },
    })
    .select()
    .single();

  if (runError || !run) {
    return NextResponse.json(
      { error: runError?.message ?? "Failed to create run" },
      { status: 500 }
    );
  }

  try {
    const result = await runBrainstormAgent({
      rawInput,
      provider,
    });

    const { error: updateError } = await supabase
      .from("agent_runs")
      .update({
        status: "completed",
        provider: result.provider,
        model: result.model,
        output: result.output,
        tokens_input: result.usage.inputTokens,
        tokens_output: result.usage.outputTokens,
        estimated_cost: result.estimatedCost,
        latency_ms: result.latencyMs,
        validation_passed: true,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    await supabase.from("agent_outputs").insert({
      agent_run_id: run.id,
      idea_id: ideaId,
      stage: "brainstorm",
      schema_version: SCHEMA_VERSION,
      data: result.output,
    });

    await supabase
      .from("ideas")
      .update({ current_stage: "brainstorm" })
      .eq("id", ideaId);

    const { data: completedRun } = await supabase
      .from("agent_runs")
      .select("*")
      .eq("id", run.id)
      .single();

    return NextResponse.json(completedRun);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Agent failed";

    await supabase
      .from("agent_runs")
      .update({
        status: "failed",
        error: message,
        validation_passed: false,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    return NextResponse.json({ error: message, run_id: run.id }, { status: 500 });
  }
}
