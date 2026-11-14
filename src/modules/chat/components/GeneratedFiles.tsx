"use client";

import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Presentation,
  type LucideIcon,
} from "lucide-react";

import { generatedFileUrl } from "../api";
import type { GeneratedFile } from "../schemas";
import { Badge, Button } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";

/**
 * Files an answer generated (`generate_file` tool), as download cards under
 * the answer text. Three states:
 *
 *   loading — the tool is running (`generating`): a placeholder card
 *   ready   — filename, type, size and a Download button
 *   failed  — the reason, no download (the model's text explains it too)
 *
 * Downloads go through the same-origin BFF, which checks the chat belongs
 * to the viewer, so the cards keep working when a chat is reopened later.
 */

const FORMAT_META: Record<string, { label: string; Icon: LucideIcon }> = {
  pdf: { label: "PDF", Icon: FileText },
  docx: { label: "Word", Icon: FileText },
  xlsx: { label: "Excel", Icon: FileSpreadsheet },
  pptx: { label: "PowerPoint", Icon: Presentation },
  csv: { label: "CSV", Icon: FileSpreadsheet },
  md: { label: "Markdown", Icon: FileCode2 },
};

function formatMeta(file: Pick<GeneratedFile, "format" | "filename">) {
  const key = (file.format || file.filename.split(".").pop() || "").toLowerCase();
  return FORMAT_META[key] ?? { label: key.toUpperCase() || "File", Icon: FileText };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function GeneratedFiles({
  files,
  sessionId,
  generating = false,
}: {
  files: GeneratedFile[];
  /** Needed for download links; without it cards show without a button. */
  sessionId?: string;
  /** The generate_file tool is running right now: show a loading card. */
  generating?: boolean;
}) {
  if (files.length === 0 && !generating) return null;

  return (
    <section aria-label="Generated files" className="mt-3 grid gap-2 sm:grid-cols-2">
      {files.map((file) => (
        <FileCard key={file.id} file={file} sessionId={sessionId} />
      ))}
      {generating ? <LoadingCard /> : null}
    </section>
  );
}

function FileCard({ file, sessionId }: { file: GeneratedFile; sessionId?: string }) {
  const { label, Icon } = formatMeta(file);
  const failed = file.status === "failed";

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-lg border bg-background p-3",
        failed ? "border-destructive/40" : "border-border",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-md",
          failed ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
        )}
      >
        <Icon className="size-5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground" title={file.filename}>
          {file.filename}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>{label}</span>
          {!failed ? <span>· {formatBytes(file.size_bytes)}</span> : null}
          {failed ? (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle aria-hidden className="size-3" /> Failed
            </Badge>
          ) : (
            <span className="inline-flex items-center gap-1 text-foreground/80">
              <CheckCircle2 aria-hidden className="size-3 text-primary" /> Ready
            </span>
          )}
        </div>
        {failed && file.error ? (
          <p className="mt-1 line-clamp-2 text-xs text-destructive" title={file.error}>
            {file.error}
          </p>
        ) : null}
      </div>

      {!failed && sessionId ? (
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <a
            href={generatedFileUrl(sessionId, file.id)}
            download={file.filename}
            aria-label={`Download ${file.filename}`}
          >
            <Download aria-hidden />
            Download
          </a>
        </Button>
      ) : null}
    </div>
  );
}

function LoadingCard() {
  return (
    <div
      className="flex min-w-0 items-center gap-3 rounded-lg border border-dashed border-border bg-background p-3"
      aria-live="polite"
    >
      <span aria-hidden className="size-10 shrink-0 animate-pulse rounded-md bg-muted" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm text-muted-foreground">Generating file…</p>
        <span aria-hidden className="block h-2 w-24 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
