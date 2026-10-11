import type { Metadata } from "next";

import { ProjectKnowledgeTab } from "./ProjectKnowledgeTab";

export const metadata: Metadata = { title: "Project Knowledge" };

export default async function KnowledgePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectKnowledgeTab projectId={projectId} />;
}
