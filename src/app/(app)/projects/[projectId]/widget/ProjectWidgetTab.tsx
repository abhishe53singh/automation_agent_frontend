"use client";

import { EmbedWidgetsPanel } from "@/modules/embed/components/EmbedWidgetsPanel";
import { useProject } from "@/modules/projects/hooks";
import { canEdit } from "@/modules/projects/rbac";
import { EmptyState } from "@/shared/ui";
import { PanelSkeleton } from "@/shared/ui/AsyncBoundary";

export function ProjectWidgetTab({ projectId }: { projectId: string }) {
  const { data: project, isPending } = useProject(projectId);

  if (isPending) return <PanelSkeleton />;
  if (!project) return null;
  if (!canEdit(project)) {
    return (
      <EmptyState
        title="Website widget"
        description="Only project owners and editors can manage the website widget."
      />
    );
  }
  return <EmbedWidgetsPanel projectId={projectId} />;
}
