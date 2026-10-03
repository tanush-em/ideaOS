import { FolderOpen } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import { DemoProjectButton } from "@/components/projects/demo-project-button";
import { ProjectCard } from "@/components/projects/project-card";
import { createClient } from "@/lib/supabase/server";
import type { ProjectWithStats } from "@/types/database";

async function getProjects(userId: string): Promise<ProjectWithStats[]> {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (!projects) return [];

  return Promise.all(
    projects.map(async (project) => {
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
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const projects = user ? await getProjects(user.id) : [];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader userEmail={user?.email} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Your projects</h1>
            <p className="mt-1 text-muted-foreground">
              Explore product ideas with AI agents — brainstorm, critique, and
              refine into blueprints.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <DemoProjectButton />
            <NewProjectDialog />
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="mt-16 flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-card/30 px-6 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10">
              <FolderOpen className="size-7 text-primary" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">No projects yet</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Create your first project to start exploring a founder idea through
              the agent pipeline.
            </p>
            <div className="mt-6">
              <NewProjectDialog />
            </div>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
