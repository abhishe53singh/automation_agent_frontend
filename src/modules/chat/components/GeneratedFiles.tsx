"use client";

import * as React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileCode2,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  Maximize2,
  Presentation,
  type LucideIcon,
} from "lucide-react";

import { generatedFileUrl } from "../api";
import type { GeneratedFile } from "../schemas";
import { Badge, Button, Dialog } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";

/**
 * Files an answer generated, under the answer text: documents from the
 * `generate_file` tool as download cards, and images from image-capable
 * models shown inline (click for full size). States:
 *
 *   loading — a file/image is being made (`generating`): a placeholder card
 *   ready   — filename, type, size and a Download button (images: preview)
 *   failed  — the reason, no download (the model's text explains it too)
 *
 * Bytes go through the same-origin BFF, which checks the chat belongs
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

function isImage(file: GeneratedFile): boolean {
  return file.status === "ready" && (file.mime_type ?? "").startsWith("image/");
}

export function GeneratedFiles({
  files,
  sessionId,
  generating = false,
}: {
  files: GeneratedFile[];
  /** Needed for download links; without it cards show without a button. */
  sessionId?: string;
  /** A file or image is being made right now: show a loading card. */
  generating?: false | "file" | "image";
}) {
  if (files.length === 0 && !generating) return null;

  const images = sessionId ? files.filter(isImage) : [];
  const others = files.filter((file) => !images.includes(file));

  return (
    <>
      {images.length > 0 || generating === "image" ? (
        <section aria-label="Generated images" className="mt-3 flex flex-wrap gap-3">
          {images.map((file) => (
            <ImageCard key={file.id} file={file} sessionId={sessionId!} />
          ))}
          {generating === "image" ? <ImageLoadingCard /> : null}
        </section>
      ) : null}
      {others.length > 0 || generating === "file" ? (
        <section aria-label="Generated files" className="mt-3 grid gap-2 sm:grid-cols-2">
          {others.map((file) => (
            <FileCard key={file.id} file={file} sessionId={sessionId} />
          ))}
          {generating === "file" ? <LoadingCard /> : null}
        </section>
      ) : null}
    </>
  );
}

function ImageCard({ file, sessionId }: { file: GeneratedFile; sessionId: string }) {
  const [open, setOpen] = React.useState(false);
  const url = generatedFileUrl(sessionId, file.id);
  const alt = file.title ? `Generated image: ${file.title}` : file.filename;

  return (
    <figure className="group relative w-full max-w-md overflow-hidden rounded-lg border border-border bg-muted">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`View ${file.filename} full size`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={alt} loading="lazy" className="block h-auto w-full" />
      </button>
      <figcaption className="flex items-center justify-between gap-2 border-t border-border bg-background px-3 py-2 text-xs text-muted-foreground">
        <span className="min-w-0 truncate" title={file.filename}>
          {file.filename} · {formatBytes(file.size_bytes)}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded p-1 hover:bg-accent hover:text-accent-foreground"
            aria-label="View full size"
            title="View full size"
          >
            <Maximize2 aria-hidden className="size-3.5" />
          </button>
          <a
            href={url}
            download={file.filename}
            className="rounded p-1 hover:bg-accent hover:text-accent-foreground"
            aria-label={`Download ${file.filename}`}
            title="Download"
          >
            <Download aria-hidden className="size-3.5" />
          </a>
        </span>
      </figcaption>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        className="max-w-5xl bg-background p-3 pt-12"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={alt} className="mx-auto max-h-[80vh] w-auto rounded-md object-contain" />
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-sm text-muted-foreground">{file.title || file.filename}</p>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <a href={url} download={file.filename}>
              <Download aria-hidden />
              Download
            </a>
          </Button>
        </div>
      </Dialog>
    </figure>
  );
}

function ImageLoadingCard() {
  return (
    <div
      className="flex aspect-square w-full max-w-xs flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/50 text-muted-foreground"
      aria-live="polite"
    >
      <ImageIcon aria-hidden className="size-8 animate-pulse" />
      <p className="text-sm">Generating image…</p>
    </div>
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
