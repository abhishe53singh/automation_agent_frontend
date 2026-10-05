"use client";

import { useEffect } from "react";

import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";

/**
 * Root route error boundary (phase_1.txt item 7). Catches errors in the layout
 * itself; global-error.tsx catches failures even further up (root layout).
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Real reporting lands with the logging backend (phase 2).
    console.error("Root segment error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <EmptyState
        title="Application error"
        description={error.message || "An unexpected error occurred."}
        action={
          <Button type="button" onClick={reset}>
            Try again
          </Button>
        }
        className="max-w-md"
      />
    </div>
  );
}
