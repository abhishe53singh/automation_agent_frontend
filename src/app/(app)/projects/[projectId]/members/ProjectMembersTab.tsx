"use client";

import * as React from "react";
import { useProject } from "@/modules/projects/hooks";
import { MembersPanel } from "@/modules/projects/components/MembersPanel";
import { PanelSkeleton } from "@/shared/ui/AsyncBoundary";

export function ProjectMembersTab({ projectId }: { projectId: string }) {
  const { data: project, isPending } = useProject(projectId);

  if (isPending) return <PanelSkeleton />;
  if (!project) return null;

  return <MembersPanel project={project} />;
}
