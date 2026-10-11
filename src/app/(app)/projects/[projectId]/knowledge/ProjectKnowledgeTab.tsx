"use client";

import { FilesPanel } from "@/modules/knowledge";
import { PageSection } from "@/shared/ui";

/**
 * Project Knowledge tab — Files first (vertical slice 1).
 * Documents / Bases / Search arrive as later slices in this same tab.
 */
export function ProjectKnowledgeTab({ projectId }: { projectId: string }) {
  return (
    <div className="space-y-6">
      <FilesPanel projectId={projectId} />
      <PageSection
        title="Documents and search"
        description="Attach searchable collections and search them — coming in the next slice."
      >
        <p className="text-sm text-muted-foreground">
          Upload files above, then prepare them for search from each file&apos;s menu.
        </p>
      </PageSection>
    </div>
  );
}
