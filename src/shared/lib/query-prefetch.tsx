import { HydrationBoundary, QueryClient, dehydrate, type QueryKey } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { ApiError } from "@/shared/lib/api";

/**
 * Server-side prefetch helper (.agent/phase_2.txt item 15).
 *
 * A page that already knows its data on the server should ship it inside a
 * `HydrationBoundary` so the first client render has zero loading flash. The
 * queryFn runs on the server — it calls the SAME BFF route the browser would
 * (the cookies travel with the server-side request), so there is exactly one
 * contract.
 *
 * A failed prefetch is swallowed on purpose: the page still renders and the
 * client-side query retries (or shows its error UI). Throwing here would turn a
 * backend hiccup into a whole-page error boundary.
 */
export async function prefetchQuery(
  queryClient: QueryClient,
  queryKey: QueryKey,
  queryFn: () => Promise<unknown>,
): Promise<void> {
  try {
    await queryClient.prefetchQuery({ queryKey, queryFn });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      // No session server-side: leave the cache empty and let the guard redirect.
      return;
    }
    console.error(`[prefetch] failed for ${queryKey.join("/")}:`, error);
  }
}

/** Build a fresh QueryClient for one server render (never a shared singleton). */
export function createServerQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Server prefetches must never refetch while rendering.
        staleTime: 30_000,
        retry: false,
      },
    },
  });
}

/**
 * Convenience wrapper: prefetch and wrap in one call.
 *
 *   export default async function Page() {
 *     return (
 *       <PrefetchedBoundary
 *         queryKey={userKeys.session}
 *         queryFn={() => getSession()}
 *       >
 *         <SettingsClient />
 *       </PrefetchedBoundary>
 *     );
 *   }
 */
export async function PrefetchedBoundary({
  queryKey,
  queryFn,
  children,
}: {
  queryKey: QueryKey;
  queryFn: () => Promise<unknown>;
  children: ReactNode;
}) {
  const queryClient = createServerQueryClient();
  await prefetchQuery(queryClient, queryKey, queryFn);
  return <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>;
}
