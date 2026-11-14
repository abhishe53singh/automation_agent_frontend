"use client";

import * as React from "react";
import { DatabaseBackup, Download, Upload } from "lucide-react";
import { toast } from "sonner";

import { useExportRegistry, useImportRegistry } from "../hooks";
import { REGISTRY_BUNDLE_FORMAT, type RegistryImportResult } from "../api";
import { Button, Card, CardDescription, CardHeader, CardTitle, Dialog, Input } from "@/shared/ui";
import { isApiError } from "@/shared/lib/api";

/**
 * Back up / restore the whole LLM registry (every provider with its API key,
 * every model, in every status) as a password-encrypted file, so the registry
 * can be rebuilt if the database is lost or moved.
 *
 * Encryption happens on the server with the password typed here (scrypt +
 * AES-256-GCM); the password is never stored, and without it the file cannot
 * be opened by anyone.
 */

const MIN_PASSWORD = 10;
/** A registry backup is small; refuse anything absurd before reading it. */
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function errorText(error: unknown, fallback: string): string {
  return isApiError(error) ? error.message : error instanceof Error ? error.message : fallback;
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function RegistryTransfer() {
  const [mode, setMode] = React.useState<"export" | "import" | null>(null);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <DatabaseBackup className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <div className="space-y-1">
              <CardTitle>Backup &amp; restore</CardTitle>
              <CardDescription>
                Download all providers (with their API keys) and models as a password-protected
                file. Import it to rebuild the registry after a database problem or on another
                server.
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
  const exporter = useExportRegistry();
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
        const { providers, models, providers_with_key } = result.summary;
        toast.success(
          `Exported ${plural(providers, "provider")} (${providers_with_key} with an API key) and ${plural(models, "model")}.`,
        );
        onClose();
      },
      onError: (err) => setError(errorText(err, "Export failed.")),
    });
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Export models & providers"
      description="Every provider and model, including archived and deleted ones."
    >
      <form onSubmit={submit} className="space-y-3">
        <p className="rounded-md bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
          The file contains your provider <strong>API keys</strong>. Keep it somewhere safe, and
          keep the password separately. If you forget the password, the file cannot be opened.
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
  const importer = useImportRegistry();
  const [bundle, setBundle] = React.useState<Record<string, unknown> | null>(null);
  const [fileName, setFileName] = React.useState<string>();
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string>();
  const [result, setResult] = React.useState<RegistryImportResult | null>(null);

  const onFile = async (file: File | undefined) => {
    setBundle(null);
    setError(undefined);
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError("That file is too large to be a models & providers backup.");
      return;
    }
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
      const format = (parsed as { format?: unknown }).format;
      if (format !== REGISTRY_BUNDLE_FORMAT) {
        setError(
          format === "automation-agent-integrations"
            ? "This is an integrations export. Import it on the Integrations page."
            : "This is not a models & providers backup file.",
        );
        return;
      }
      setBundle(parsed as Record<string, unknown>);
      setFileName(file.name);
    } catch {
      setError("Could not read the file. Choose the .aallm.json file you exported.");
    }
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!bundle) {
      setError("Choose the backup file first.");
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
      result.providers_created && `${plural(result.providers_created, "provider")} added`,
      result.providers_updated && `${plural(result.providers_updated, "provider")} updated`,
      result.models_created && `${plural(result.models_created, "model")} added`,
      result.models_updated && `${plural(result.models_updated, "model")} updated`,
    ].filter(Boolean) as string[];
    return (
      <Dialog open onClose={onClose} title="Restore complete">
        <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
          {(lines.length ? lines : ["The file was empty; nothing changed."]).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Each record keeps the status it had in the backup (active, archived or deleted).
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
      title="Import models & providers"
      description="Providers with the same name and models with the same name under that provider are updated; the rest are added. Nothing is deleted."
    >
      <form onSubmit={submit} className="space-y-3">
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-foreground">Backup file</span>
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
        <p className="text-xs text-muted-foreground">
          A stored API key is only replaced when the backup contains one.
        </p>
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
