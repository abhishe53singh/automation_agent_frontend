"use client";

import { FileUp } from "lucide-react";

import { AsyncBoundary, EmptyState, PageSection, Skeleton } from "@/shared/ui";
import { useFiles } from "../hooks";
import { FileRow } from "./FileRow";
import { FileUploadZone } from "./FileUploadZone";

/**
 * Files panel — the project Knowledge > Files tab content (phase 5 item 41).
 * projectId comes from the route; upload scope is derived, never typed.
 */

export function FilesPanel({ projectId }: { projectId?: string }) {
  const files = useFiles({ projectId });

  return (
    <div className="space-y-6">
      <PageSection
        title="Upload"
        description={
          projectId
            ? "Files upload into this project."
            : "Files upload without a project. Move one later from its menu."
        }
      >
        <FileUploadZone projectId={projectId} />
      </PageSection>

      <PageSection title="Files" description="Everything uploaded here.">
        <AsyncBoundary
          isPending={files.isPending}
          error={files.error}
          isEmpty={!files.data || files.data.length === 0}
          skeleton={
            <div className="space-y-2 rounded-lg border border-border">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="size-8" />
                </div>
              ))}
            </div>
          }
          empty={
            <EmptyState
              icon={FileUp}
              title="No files yet"
              description="Upload a file above to make it searchable."
            />
          }
          errorTitle="Couldn't load files"
          onRetry={() => void files.refetch()}
        >
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {(files.data ?? []).map((file) => (
              <FileRow key={file.id} file={file} />
            ))}
          </ul>
        </AsyncBoundary>
      </PageSection>
    </div>
  );
}
