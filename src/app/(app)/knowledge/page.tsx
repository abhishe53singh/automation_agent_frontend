import type { Metadata } from "next";

import type { Metadata } from "next";

import { FilesPanel } from "@/modules/knowledge";
import { Breadcrumbs, PageHeader } from "@/shared/ui";

export const metadata: Metadata = { title: "Knowledge" };

/** Cross-project Files view (no project scope; scoped view is per-project). */
export default function KnowledgePage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="Knowledge"
        description="Files across all projects. Upload here, then prepare them for search."
        breadcrumbs={<Breadcrumbs items={[{ label: "Knowledge" }]} />}
      />
      <FilesPanel />
    </div>
  );
}
