import type { Metadata } from "next";

import { EmptyState } from "@/shared/ui/EmptyState";

export const metadata: Metadata = { title: "Knowledge" };

/** Placeholder — knowledge bases, documents and search land in phase 5. */
export default function KnowledgePage() {
  return (
    <EmptyState
      title="No knowledge bases yet"
      description="Document ingestion, chunking, embeddings and search arrive in phase 5."
    />
  );
}
