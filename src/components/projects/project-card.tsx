import Link from "next/link";
import { GitBranch, FolderOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRelativeDate } from "@/lib/utils";
import type { ProjectWithStats } from "@/types/database";

interface ProjectCardProps {
  project: ProjectWithStats;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="group h-full transition-colors hover:border-primary/40 hover:bg-card/80">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <FolderOpen className="size-5 text-primary" />
            </div>
            <Badge variant="secondary" className="shrink-0">
              {formatRelativeDate(project.updated_at)}
            </Badge>
          </div>
          <CardTitle className="mt-3 line-clamp-1 text-lg group-hover:text-primary">
            {project.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {project.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {project.description}
            </p>
          )}
          <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <GitBranch className="size-3" />
              {project.branch_count} branch{project.branch_count !== 1 ? "es" : ""}
            </span>
            <span>{project.idea_count} idea{project.idea_count !== 1 ? "s" : ""}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
