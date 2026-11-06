import type { Metadata } from "next";

import { ProjectWidgetTab } from "./ProjectWidgetTab";

export const metadata: Metadata = { title: "Website widget" };

export default async function WidgetPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ProjectWidgetTab projectId={projectId} />;
}
