import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const projectsWithStats = await Promise.all(
    (projects ?? []).map(async (project) => {
      const { count: ideaCount } = await supabase
        .from("ideas")
        .select("*", { count: "exact", head: true })
        .eq("project_id", project.id);

      const { count: branchCount } = await supabase
        .from("ideas")
        .select("*", { count: "exact", head: true })
        .eq("project_id", project.id)
        .not("parent_id", "is", null);

      return {
        ...project,
        idea_count: ideaCount ?? 0,
        branch_count: branchCount ?? 0,
      };
    })
  );

  return NextResponse.json(projectsWithStats);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const name = body.name?.trim();
  const description = body.description?.trim() || null;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({ user_id: user.id, name, description })
    .select()
    .single();

  if (projectError) {
    return NextResponse.json({ error: projectError.message }, { status: 500 });
  }

  const { error: ideaError } = await supabase.from("ideas").insert({
    project_id: project.id,
    user_id: user.id,
    title: name,
    is_root: true,
    current_stage: "intake",
  });

  if (ideaError) {
    return NextResponse.json({ error: ideaError.message }, { status: 500 });
  }

  return NextResponse.json(project, { status: 201 });
}
