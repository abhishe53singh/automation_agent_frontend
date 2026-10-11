"use client";

import { RefreshCw } from "lucide-react";

import { DropdownMenuItem } from "@/shared/ui";
import { useIngestFile, useQueueIngestion } from "../hooks";
import type { IngestionJobStatus } from "../schemas";

/** Prepare-for-search menu items (inline + background queue). Modular split from FileRow. */
export function IngestMenuItems({
  fileId,
  jobStatus,
}: {
  fileId: string;
  jobStatus?: IngestionJobStatus;
}) {
  const ingest = useIngestFile(fileId);
  const queue = useQueueIngestion(fileId);
  const active = jobStatus === "running" || jobStatus === "pending";
  const busy = ingest.isPending || queue.isPending || active;

  return (
    <>
      <DropdownMenuItem onSelect={() => ingest.mutate()} disabled={busy}>
        <RefreshCw aria-hidden /> Prepare for search
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => queue.mutate()} disabled={busy}>
        <RefreshCw aria-hidden /> Prepare in background
      </DropdownMenuItem>
    </>
  );
}
