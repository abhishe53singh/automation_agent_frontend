"use client";

import { KeyRound, LogOut, MonitorSmartphone } from "lucide-react";

import { useSessionQuery } from "@/modules/users/hooks";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui";

/** Security: password reset is not built yet; the session section shows what we know now. */
export default function SecurityPage() {
  const { data } = useSessionQuery();
  const expires = data?.expires_at ? new Date(data.expires_at) : null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Security</h2>
        <p className="text-sm text-muted-foreground">Your password and how you sign in.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground" aria-hidden />
              Password
            </CardTitle>
            <Badge variant="info">Upcoming</Badge>
          </div>
          <CardDescription>
            Change your password, or get a reset link by email if you forget it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Button variant="outline" disabled title="Coming soon">
              Change password
            </Button>
            <Button variant="outline" disabled title="Coming soon">
              Email me a reset link
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Not available yet. Until then, ask an admin if you are locked out.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorSmartphone className="h-4 w-4 text-muted-foreground" aria-hidden />
            This session
          </CardTitle>
          <CardDescription>The sign-in this browser is using.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Signed in as</dt>
              <dd className="text-sm font-medium text-foreground">{data?.user?.username ?? "—"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Session expires</dt>
              <dd className="text-sm font-medium text-foreground">
                {expires ? expires.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "—"}
              </dd>
            </div>
          </dl>
          <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            Sign out from the account menu at the bottom of the main sidebar.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
