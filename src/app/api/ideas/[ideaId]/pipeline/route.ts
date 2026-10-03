import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ideaId: string }> }
) {
  const { ideaId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: idea } = await supabase
    .from("ideas")
    .select("id")
    .eq("id", ideaId)
    .eq("user_id", user.id)
    .single();

  if (!idea) {
    return NextResponse.json({ error: "Idea not found" }, { status: 404 });
  }

  const { data: pipelineRuns } = await supabase
    .from("pipeline_runs")
    .select("*")
    .eq("idea_id", ideaId)
    .order("created_at", { ascending: false })
    .limit(1);

  const latest = pipelineRuns?.[0] ?? null;

  return NextResponse.json(latest);
}
