import Link from "next/link";

import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";

/** Root 404 — renders outside the (app) shell. */
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <EmptyState
        title="404 — Page not found"
        description="The page you are looking for does not exist or has been moved."
        action={
          <Button asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        }
        className="max-w-md"
      />
    </div>
  );
}
