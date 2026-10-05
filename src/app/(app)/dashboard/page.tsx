import type { Metadata } from "next";

import { DashboardClient } from "./DashboardClient";
import { listProjects, projectKeys } from "@/modules/projects/api";
import { PrefetchedBoundary } from "@/shared/lib/query-prefetch";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * Dashboard (item 26).
 *
 * The recent-projects list is PREFETCHED ON THE SERVER, so the first paint
 * already has data and the browser never runs a request waterfall before
 * showing content. `PrefetchedBoundary` swallows a failed prefetch, so a
 * backend hiccup degrades to the client query's own error state rather than a
 * whole-page error boundary.
 */
export default function DashboardPage() {
  return (
    <PrefetchedBoundary queryKey={projectKeys.recent()} queryFn={() => listProjects()}>
      <DashboardClient />
    </PrefetchedBoundary>
  );
}
