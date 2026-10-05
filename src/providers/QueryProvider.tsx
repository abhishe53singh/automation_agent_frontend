"use client";

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
  type DefaultOptions,
} from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";

import { ApiError } from "@/shared/lib/api";

/**
 * TanStack Query provider (.agent/phase_2.txt item 15).
 *
 * Defaults encode the retry budget: only transport failures and rate limits are
 * retried (twice, with backoff). A 4xx — validation, conflict, forbidden, 401 —
 * is the server's final answer, so retrying it would only burn the budget.
 *
 * The caches also own the global error surface (item 18): a query that ends in
 * failure *after* its retry budget, and any failed mutation, produces exactly
 * one toast. Per-call error UI still wins because a component that renders
 * `error` takes precedence over the toast timing.
 */

/** Transient failures only. Unknown throwables (bugs) are never retried. */
function isRetryable(error: unknown): boolean {
  return error instanceof ApiError && error.isTransient;
}

const defaultOptions: DefaultOptions = {
  queries: {
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry(failureCount, error) {
      // At most 2 retries; give up immediately on a non-transient error.
      if (failureCount >= 2) return false;
      return isRetryable(error);
    },
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
  },
  mutations: {
    // Mutations are user-initiated: report the failure, never auto-retry it.
    retry: false,
  },
};

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Created inside useState so each browser session gets exactly one
  // QueryClient (a module-level singleton would leak between requests in SSR).
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions,
        queryCache: new QueryCache({
          onError: (error) => toast.error(toMessage(error)),
        }),
        mutationCache: new MutationCache({
          onError: (error) => toast.error(toMessage(error)),
        }),
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}
