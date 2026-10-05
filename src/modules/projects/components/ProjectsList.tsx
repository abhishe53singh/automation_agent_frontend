"use client";

import { useProjects } from "../hooks";
import { ProjectCard } from "./ProjectCard";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { AsyncBoundary, CardGridSkeleton } from "@/shared/ui/AsyncBoundary";
import { EmptyState } from "@/shared/ui";

/**
 * The project list (item 22). Loading, error, empty and loaded states come
 * from the shared `AsyncBoundary`, so every data surface in the app behaves
 * the same way (item 27).
 */
export function ProjectsList() {
  const { data, isPending, error, refetch, isFetching } = useProjects();
  const projects = data ?? [];

  return (
    <AsyncBoundary
      isPending={isPending}
      error={error}
      isEmpty={projects.length === 0}
      skeleton={<CardGridSkeleton rows={3} />}
      onRetry={() => void refetch()}
      empty={
        <EmptyState
          title="No projects yet"
          description="Create a project to group chats, files and knowledge bases, and to share them with your team."
          action={<CreateProjectDialog triggerLabel="Create your first project" />}
        />
      }
    >
      <div className="space-y-3">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
        {isFetching ? <p className="text-xs text-muted-foreground">Refreshing…</p> : null}
      </div>
    </AsyncBoundary>
  );
}
