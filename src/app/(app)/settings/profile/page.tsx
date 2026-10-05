"use client";

import Link from "next/link";

import { ProfileCard } from "@/modules/users/components/ProfileCard";
import { useSessionQuery } from "@/modules/users/hooks";
import { ApiError } from "@/shared/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui";

/**
 * Profile page (.agent/phase_2.txt item 17). Reads the session user from
 * /api/session; the network-failure case renders an inline retry instead of a
 * dead end (item 18).
 *
 * A client component: `useSessionQuery` is a TanStack Query hook, so it must
 * run in the browser. The `title` metadata comes from the layout instead.
 */
export default function ProfilePage() {
  const { data, isPending, error, refetch, isFetching } = useSessionQuery();
  const user = data?.user ?? null;

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile unavailable</CardTitle>
          <CardDescription>
            {error instanceof ApiError && error.code === "network"
              ? "Cannot reach the server. Check your connection and try again."
              : "We could not load your profile."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <button
            type="button"
            onClick={() => void refetch()}
            className="text-sm text-primary hover:underline"
          >
            Try again
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Your account identity and status.{" "}
          <Link href="/settings" className="text-primary hover:underline">
            All settings
          </Link>
        </p>
      </div>

      {isPending ? (
        <div className="h-48 animate-pulse rounded-lg border border-border bg-muted/30" />
      ) : user ? (
        <ProfileCard user={user} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No active session</CardTitle>
            <CardDescription>Sign in to see your profile.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login" className="text-sm text-primary hover:underline">
              Go to sign in
            </Link>
          </CardContent>
        </Card>
      )}

      {isFetching && !isPending ? (
        <p className="text-xs text-muted-foreground">Refreshing…</p>
      ) : null}
    </div>
  );
}
