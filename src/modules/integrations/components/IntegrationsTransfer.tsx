"use client";

import * as React from "react";
import { Download, KeyRound, Upload } from "lucide-react";
import { toast } from "sonner";

import { useExportIntegrations, useImportIntegrations } from "../hooks";
import type { IntegrationsImportResult } from "../api";
import { Button, Card, CardDescription, CardHeader, CardTitle, Dialog, Input } from "@/shared/ui";
import { isApiError } from "@/shared/lib/api";

/**
 * Move the integration setup (Google connection, MCP servers + tools) to
 * another account with a password-encrypted file.
 *
 * The file contains live credentials, encrypted on the server with the
 * password typed here (scrypt + AES-256-GCM). Neither the app nor anyone else
 * can open it without that password, and the password is never stored.
 */

const MIN_PASSWORD = 10;
/** Exports are a few KB; refuse anything absurd before reading it. */
const MAX_FILE_BYTES = 2 * 1024 * 1024;

function errorText(error: unknown, fallback: string): string {
  return isApiError(error) ? error.message : error instanceof Error ? error.message : fallback;
}

export function IntegrationsTransfer() {
  const [mode, setMode] = React.useState<"export" | "import" | null>(null);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <KeyRound className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <div className="space-y-1">
              <CardTitle>Export / import setup</CardTitle>
              <CardDescription>
                Download your Google connection and MCP servers as a password-protected file, then
                import it on another account to use the same tools without reconnecting.
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setMode("export")}>
              <Download aria-hidden />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => setMode("import")}>
              <Upload aria-hidden />
              Import
            </Button>
          </div>
        </div>
      </CardHeader>

      {mode === "export" ? <ExportDialog onClose={() => setMode(null)} /> : null}
      {mode === "import" ? <ImportDialog onClose={() => setMode(null)} /> : null}
    </Card>
  );
}

function ExportDialog({ onClose }: { onClose: () => void }) {
  const exporter = useExportIntegrations();
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string>();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("The passwords do not match.");
      return;
    }
    setError(undefined);
    exporter.mutate(password, {
      onSuccess: (result) => {
        const blob = new Blob([JSON.stringify(result.bundle, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = result.filename;
        link.click();
        URL.revokeObjectURL(url);
        const parts = [
          ...result.summary.connections.map((c) => c.provider ?? "connection"),
          ...result.summary.mcp_servers.map((s) => `${s.name} (${s.tools} tools)`),
        ];
        toast.success(`Exported: ${parts.join(", ")}.`);
        onClose();
      },
      onError: (err) => setError(errorText(err, "Export failed.")),
    });
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Export integrations"
      description="Includes your Google sign-in tokens and MCP server keys."
    >
      <form onSubmit={submit} className="space-y-3">
        <p className="rounded-md bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
          Anyone with this file <strong>and</strong> its password can use your Google account
          through the app (Drive, Gmail, Calendar…). Send the password through a different channel
          than the file. If you forget it, the file cannot be opened.
        </p>
        <Input
          type="password"
          label="File password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint={`At least ${MIN_PASSWORD} characters`}
        />
        <Input
          type="password"
          label="Confirm password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={exporter.isPending}>
            <Download aria-hidden />
            Encrypt and download
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function ImportDialog({ onClose }: { onClose: () => void }) {
  const importer = useImportIntegrations();
  const [bundle, setBundle] = React.useState<Record<string, unknown> | null>(null);
  const [fileName, setFileName] = React.useState<string>();
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string>();
  const [result, setResult] = React.useState<IntegrationsImportResult | null>(null);

  const onFile = async (file: File | undefined) => {
    setBundle(null);
    setError(undefined);
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError("That file is too large to be an integrations export.");
      return;
    }
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
      if ((parsed as { format?: unknown }).format !== "automation-agent-integrations") {
        setError("This is not an integrations export file.");
        return;
      }
      setBundle(parsed as Record<string, unknown>);
      setFileName(file.name);
    } catch {
      setError("Could not read the file. Choose the .aaint.json file you exported.");
    }
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!bundle) {
      setError("Choose the export file first.");
      return;
    }
    setError(undefined);
    importer.mutate(
      { password, bundle },
      {
        onSuccess: (res) => setResult(res),
        onError: (err) => setError(errorText(err, "Import failed.")),
      },
    );
  };

  if (result) {
    const lines = [
      result.connections_created && `${result.connections_created} connection(s) added`,
      result.connections_updated && `${result.connections_updated} connection(s) replaced`,
      result.servers_created && `${result.servers_created} MCP server(s) added`,
      result.servers_updated && `${result.servers_updated} MCP server(s) updated`,
      result.tools_created && `${result.tools_created} tool(s) added`,
      result.tools_updated && `${result.tools_updated} tool(s) updated`,
    ].filter(Boolean) as string[];
    return (
      <Dialog open onClose={onClose} title="Import complete">
        <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
          {(lines.length ? lines : ["Nothing to import."]).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {result.connections_skipped.length ? (
          <p className="text-xs text-muted-foreground">
            Skipped (not supported here): {result.connections_skipped.join(", ")}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Imported Google tokens work on this app. Turn the tools on per chat from the + menu.
        </p>
        <div className="flex justify-end">
          <Button size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Import integrations"
      description="Existing items with the same provider or server name are replaced; nothing is duplicated."
    >
      <form onSubmit={submit} className="space-y-3">
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-foreground">Export file</span>
          <input
            type="file"
            accept=".json,application/json"
            onChange={(e) => void onFile(e.target.files?.[0])}
            className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:text-secondary-foreground"
          />
          {fileName && bundle ? (
            <span className="block text-xs text-muted-foreground">{fileName} ready</span>
          ) : null}
        </label>
        <Input
          type="password"
          label="File password"
          autoComplete="off"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            loading={importer.isPending}
            disabled={!bundle || !password}
          >
            <Upload aria-hidden />
            Decrypt and import
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
