"use client";

import { SearchX } from "lucide-react";
import type { ReactNode } from "react";

import { isApiError } from "@/shared/lib/api";
import { EmptyState, Skeleton } from "@/shared/ui";

/**
 * Shared loading / error / empty renderer (.agent/phase_3.txt item 27).
 *
 * Every data surface in the app needs the same three states, and the 404 case
 * has a special rule: the backend MASKS ownership/role failures as 404
 * (never 403), so a masked failure must read as a plain "Not found" instead of
 * leaking that the resource exists.
 */

export interface AsyncBoundaryProps {
  /** True while the first load is in flight. */
  isPending: boolean;
  /** The query error, if any. */
  error?: unknown;
  /** True when the request succeeded but there is nothing to show. */
  isEmpty?: boolean;
  /** Skeleton matching the real layout (avoids CLS). */
  skeleton: ReactNode;
  empty?: ReactNode;
  children: ReactNode;
  /** Message shown when `error` is not a 404. */
  errorTitle?: string;
  /** Rendered inside the error state, e.g. a "Try again" button. */
  onRetry?: () => void;
}

export function AsyncBoundary({
  isPending,
  error,
  isEmpty = false,
  skeleton,
  empty,
  children,
  errorTitle,
  onRetry,
}: AsyncBoundaryProps) {
  if (isPending) return <>{skeleton}</>;
  if (error) return <ErrorNotice error={error} title={errorTitle} onRetry={onRetry} />;
  if (isEmpty) return <>{empty}</>;
  return <>{children}</>;
}

export interface ErrorNoticeProps {
  error: unknown;
  title?: string;
  onRetry?: () => void;
}

/**
 * Error renderer with the 404 mask applied. A masked (404) failure shows
 * "Not found" and hides the retry affordance — retrying cannot help when the
 * caller simply has no access.
 */
export function ErrorNotice({ error, title, onRetry }: ErrorNoticeProps) {
  if (isApiError(error) && error.code === "not_found") {
    return (
      <EmptyState
        icon={SearchX}
        title="Not found"
        description="This item does not exist, or you do not have access to it."
      />
    );
  }

  const offline = isApiError(error) && (error.code === "network" || error.code === "timeout");

  return (
    <EmptyState
      title={title ?? (offline ? "Cannot reach the server" : "Something went wrong")}
      description={
        isApiError(error)
          ? error.message
          : error instanceof Error
            ? error.message
            : "Please try again."
      }
      action={
        onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
          >
            Try again
          </button>
        ) : undefined
      }
    />
  );
}

export interface DataSkeletonProps {
  /** Number of card/row placeholders. */
  rows?: number;
  className?: string;
}

/** Reusable list skeleton: same box model as the card grids it stands in for. */
export function CardGridSkeleton({ rows = 3, className }: DataSkeletonProps) {
  return (
    <div className={className}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="space-y-3 rounded-lg border border-border bg-card p-6 shadow-sm"
          >
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Single-panel skeleton, for detail pages. */
export function PanelSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={`space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm ${className ?? ""}`}
    >
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-9 w-32" />
    </div>
  );
}
