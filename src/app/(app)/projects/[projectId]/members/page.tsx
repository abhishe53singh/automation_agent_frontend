import type { Metadata } from "next";

import { ProjectMembersTab } from "./ProjectMembersTab";

export const metadata: Metadata = { title: "Project Members" };

export default async function MembersPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectMembersTab projectId={projectId} />;
}

