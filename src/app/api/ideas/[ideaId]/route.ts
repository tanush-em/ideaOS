import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
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

  const body = await request.json();
  const updates: Record<string, string | null> = {};

  if (body.raw_input !== undefined) {
    updates.raw_input = body.raw_input?.trim() || null;
  }
  if (body.title !== undefined) {
    updates.title = body.title?.trim() || "Untitled Idea";
  }
  if (body.current_stage !== undefined) {
    updates.current_stage = body.current_stage;
  }

  const { data: idea, error } = await supabase
    .from("ideas")
    .update(updates)
    .eq("id", ideaId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!idea) {
    return NextResponse.json({ error: "Idea not found" }, { status: 404 });
  }

  return NextResponse.json(idea);
}
