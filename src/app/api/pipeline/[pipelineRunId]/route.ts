import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ pipelineRunId: string }> }
) {
  const { pipelineRunId } = await params;
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

  const { data: runs } = await supabase
    .from("agent_runs")
    .select("*")
    .eq("idea_id", pipelineRun.idea_id)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    pipeline_run: pipelineRun,
    agent_runs: runs ?? [],
  });
}
