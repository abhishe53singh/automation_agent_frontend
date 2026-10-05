"use client";

import { useEffect } from "react";

import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";

/**
 * Error boundary for the (app) segment (phase_1.txt item 7). The root-level
 * boundaries are src/app/error.tsx and src/app/global-error.tsx.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Real reporting lands with the logging backend (phase 2).
    console.error("App segment error:", error);
  }, [error]);

  return (
    <EmptyState
      title="Something went wrong"
      description={error.message || "An unexpected error occurred while loading this page."}
      action={
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      }
    />
  );
}
