import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProjectDetail } from "./ProjectDetail";
import { listProjects } from "@/modules/projects/api";

/**
 * Project detail route (/projects/[projectId]) — items 22-24.
 *
 * A server component: it prefetches the project so the first paint has the
 * data. The membership check happens server-side via the same list endpoint the
 * browser uses, so an unknown id AND a non-member both land on the app's
 * not-found page — the 404 mask is never leaked (item 24).
 */
export const metadata: Metadata = { title: "Project" };

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  // A failed prefetch must not blow up the route: `ProjectDetail` renders the
  // "Not found" state itself. This list is only used to short-circuit the
  // common "no access" case before the client even boots.
  const visible = await listProjects().then(
    (projects) => projects.some((project) => project.id === projectId),
    () => true,
  );
  if (!visible) notFound();

  return <ProjectDetail projectId={projectId} />;
}
