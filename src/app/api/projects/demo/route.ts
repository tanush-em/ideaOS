import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DEMO_PROJECT_NAME = "Demo — Freelancer Payment Blueprint";
const DEMO_RAW_INPUT =
  "Build an AI tool that helps freelancers get paid faster (e.g., automated invoice follow-ups, payment reminders, and lightweight contract/milestone tracking). Focus on small freelancers and agencies; MVP should be doable in 2 weeks.";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name: DEMO_PROJECT_NAME,
      description:
        "Pre-seeded sample project to demo the IdeaOS agent pipeline.",
    })
    .select()
    .single();

  if (projectError || !project) {
    return NextResponse.json(
      { error: projectError?.message ?? "Failed to create demo project" },
      { status: 500 }
    );
  }

  const { error: ideaError } = await supabase.from("ideas").insert({
    project_id: project.id,
    user_id: user.id,
    title: DEMO_PROJECT_NAME,
    raw_input: DEMO_RAW_INPUT,
    is_root: true,
    current_stage: "intake",
  });

  if (ideaError) {
    return NextResponse.json(
      { error: ideaError.message ?? "Failed to create demo idea" },
      { status: 500 }
    );
  }

  return NextResponse.json({ project }, { status: 201 });
}

