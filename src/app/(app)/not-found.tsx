import Link from "next/link";

import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";

/**
 * Segment-scoped not-found boundary for the (app) group. It renders INSIDE the
 * shell, so the sidebar and topbar stay visible.
 */
export default function AppNotFound() {
  return (
    <EmptyState
      title="Page not found"
      description="The page you are looking for does not exist or has been moved."
      action={
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      }
    />
  );
}
