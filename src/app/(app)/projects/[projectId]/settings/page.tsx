import type { Metadata } from "next";

import { ProjectSettingsTab } from "./ProjectSettingsTab";

export const metadata: Metadata = { title: "Project Settings" };

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectSettingsTab projectId={projectId} />;
}
