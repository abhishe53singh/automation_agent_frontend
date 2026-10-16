"use client";

import * as React from "react";
import { CheckCircle2, Globe, Key, Link2, ShieldCheck, Unlink } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { useConnections, useCreateConnection, useDeleteConnection } from "../hooks";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  Dialog,
  Input,
  Skeleton,
} from "@/shared/ui";

export function IntegrationsPanel({ projectId }: { projectId?: string }) {
  const connections = useConnections();
  const deleteConn = useDeleteConnection();
  const createConn = useCreateConnection();

  const [confirmDisconnectId, setConfirmDisconnectId] = React.useState<string | null>(null);
  const [showManualModal, setShowManualModal] = React.useState(false);
  const [manualToken, setManualToken] = React.useState("");
  const [manualScopes, setManualScopes] = React.useState("");

  const googleConnection = connections.data?.find((c) => c.provider === "google" && c.is_active);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) {
      toast.error("Access token is required.");
      return;
    }
    const scopesList = manualScopes
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    createConn.mutate(
      {
        provider: "google",
        access_token: manualToken.trim(),
        scopes: scopesList.length > 0 ? scopesList : undefined,
        project_id: projectId,
      },
      {
        onSuccess: () => {
          setShowManualModal(false);
          setManualToken("");
          setManualScopes("");
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Google Workspace Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-500" />
                <CardTitle>Google Workspace</CardTitle>
              </div>
              {googleConnection ? (
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Connected
                </Badge>
              ) : (
                <Badge variant="neutral">Not connected</Badge>
              )}
            </div>
            <CardDescription>
              Connect Gmail, Google Calendar, Google Docs, and Google Sheets.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {connections.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-8 w-1/2" />
              </div>
            ) : googleConnection ? (
              <div className="space-y-3 rounded-lg border border-border p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fingerprint:</span>
                  <span className="font-mono text-xs">
                    {googleConnection.access_token_fingerprint ?? "encrypted"}
                  </span>
                </div>
                {googleConnection.token_expires_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expires at:</span>
                    <span className="text-xs">
                      {new Date(googleConnection.token_expires_at).toLocaleString()}
                    </span>
                  </div>
                )}
                {googleConnection.scopes && googleConnection.scopes.length > 0 && (
                  <div>
                    <span className="text-muted-foreground text-xs block mb-1">Granted scopes:</span>
                    <div className="flex flex-wrap gap-1">
                      {googleConnection.scopes.map((s) => (
                        <span key={s} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => setConfirmDisconnectId(googleConnection.id)}
                  >
                    <Unlink className="h-4 w-4 mr-1" /> Disconnect
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/api/integrations/google/authorize">
                      <Link2 className="h-4 w-4 mr-1" /> Reconnect
                    </a>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Authorize read and write access to your Google account securely using OAuth 2.0.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <a href="/api/integrations/google/authorize">
                      <Link2 className="h-4 w-4 mr-1" /> Connect Google Account
                    </a>
                  </Button>
                  <Button variant="outline" onClick={() => setShowManualModal(true)}>
                    <Key className="h-4 w-4 mr-1" /> Manual Token
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Model Context Protocol (MCP) Navigation Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-purple-500" />
                <CardTitle>Model Context Protocol (MCP)</CardTitle>
              </div>
              <Badge variant="neutral">Registry</Badge>
            </div>
            <CardDescription>
              Register local or remote MCP servers to expose external tools to agents.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure command-line and SSE MCP servers, customize tool execution permissions
              (allowed, requires confirmation, blocked), and approve pending tool requests.
            </p>
            <Button variant="outline" asChild>
              <Link href="/integrations/mcp">Manage MCP Registry & Approvals</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Disconnect confirmation modal */}
      {confirmDisconnectId && (
        <ConfirmDialog
          open={Boolean(confirmDisconnectId)}
          onOpenChange={(isOpen) => {
            if (!isOpen) setConfirmDisconnectId(null);
          }}
          title="Disconnect Google Integration"
          description="Are you sure you want to disconnect your Google account? Autonomous agents will no longer be able to interact with your Google Workspace resources."
          confirmLabel="Disconnect"
          variant="destructive"
          onConfirm={() => {
            deleteConn.mutate(confirmDisconnectId, {
              onSettled: () => setConfirmDisconnectId(null),
            });
          }}
        />
      )}

      {/* Manual Connection Dialog for testing/dev */}
      {showManualModal && (
        <Dialog
          open
          title="Add Provider Token"
          description="Manually register an encrypted OAuth access token for testing."
          onClose={() => setShowManualModal(false)}
        >
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground">Provider</label>
              <Input value="google" disabled />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Access Token</label>
              <Input
                placeholder="ya29.a0AfH6SMC..."
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">
                Scopes (comma-separated, optional)
              </label>
              <Input
                placeholder="https://www.googleapis.com/auth/gmail.readonly"
                value={manualScopes}
                onChange={(e) => setManualScopes(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowManualModal(false)}
                disabled={createConn.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" loading={createConn.isPending}>
                Save Connection
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
