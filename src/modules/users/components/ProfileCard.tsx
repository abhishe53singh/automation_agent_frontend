"use client";

import type { User } from "@/modules/auth/schemas";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui";

import { AdminStatusControl } from "./AdminStatusControl";

/**
 * Read-only profile card (.agent/phase_2.txt item 17). The backend has no
 * "update me" operation, so these fields are informational only — a
 * fullName/bio editor lands with the users module's later phases.
 */
export function ProfileCard({ user }: { user: User }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Your account details as stored on the server.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Username</dt>
            <dd className="text-sm font-medium text-foreground">{user.username}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Email</dt>
            <dd className="text-sm font-medium text-foreground">{user.email}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">User ID</dt>
            <dd className="font-mono text-xs text-muted-foreground break-all">{user.id}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Status</dt>
            <dd>
              <Badge variant={user.is_active ? "success" : "destructive"}>
                {user.is_active ? "Active" : "Deactivated"}
              </Badge>
            </dd>
          </div>
        </dl>

        {/* Admins can activate/deactivate the signed-in account (self-change is
            rejected upstream with 400; the toast explains it). */}
        <div className="mt-6 border-t border-border pt-4">
          <AdminStatusControl target={user} />
        </div>
      </CardContent>
    </Card>
  );
}
