import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { listProjects } from "@/modules/projects/api";
import { ProjectWorkspaceLayout } from "./_components/ProjectWorkspaceLayout";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  // Masked check: short-circuit before rendering
  const visible = await listProjects().then(
    (projects) => projects.some((project) => project.id === projectId),
    () => true,
  );
  if (!visible) notFound();

  return (
    <ProjectWorkspaceLayout projectId={projectId}>
      {children}
    </ProjectWorkspaceLayout>
  );
}
