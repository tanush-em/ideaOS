import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ideaId: string }> }
) {
  const { ideaId } = await params;
  const body = await request.json();
  const branch_reason: string | undefined = body.branch_reason;
  const title: string | undefined = body.title;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: parentIdea, error: parentError } = await supabase
    .from("ideas")
    .select("*")
    .eq("id", ideaId)
    .eq("user_id", user.id)
    .single();

  if (parentError || !parentIdea) {
    return NextResponse.json({ error: "Idea not found" }, { status: 404 });
  }

  const reason = (branch_reason ?? "").trim();
  if (!reason) {
    return NextResponse.json(
      { error: "branch_reason is required" },
      { status: 400 }
    );
  }

  const { data: branchIdea, error: branchError } = await supabase
    .from("ideas")
    .insert({
      project_id: parentIdea.project_id,
      user_id: user.id,
      parent_id: parentIdea.id,
      branch_reason: reason,
      title: (title ?? parentIdea.title ?? "Untitled Idea").trim(),
      raw_input: parentIdea.raw_input,
      // Copy-on-write: start the branch at the same stage as the parent.
      current_stage: parentIdea.current_stage,
      is_root: false,
    })
    .select()
    .single();

  if (branchError || !branchIdea) {
    return NextResponse.json(
      { error: branchError?.message ?? "Failed to create branch" },
      { status: 500 }
    );
  }

  // Copy completed agent runs from parent into the branch.
  // This keeps branch history consistent without re-running past stages.
  const { data: parentRuns, error: parentRunsError } = await supabase
    .from("agent_runs")
    .select("*")
    .eq("idea_id", parentIdea.id)
    .eq("project_id", parentIdea.project_id)
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("created_at", { ascending: true });

  if (parentRunsError) {
    return NextResponse.json(
      { error: parentRunsError.message ?? "Failed to read parent runs" },
      { status: 500 }
    );
  }

  if (parentRuns && parentRuns.length > 0) {
    // Insert only the fields we need for UI (avoid copying the original IDs).
    await supabase.from("agent_runs").insert(
      parentRuns.map((r) => ({
        idea_id: branchIdea.id,
        project_id: parentIdea.project_id,
        user_id: user.id,
        agent_name: r.agent_name,
        stage: r.stage,
        status: r.status,
        provider: r.provider,
        model: r.model,
        input: r.input,
        output: r.output,
        error: r.error,
        tokens_input: r.tokens_input,
        tokens_output: r.tokens_output,
        estimated_cost: r.estimated_cost,
        latency_ms: r.latency_ms,
        validation_passed: r.validation_passed,
        created_at: r.created_at,
        completed_at: r.completed_at,
      }))
    );
  }

  return NextResponse.json(branchIdea, { status: 201 });
}

