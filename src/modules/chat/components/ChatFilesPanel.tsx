"use client";

import * as React from "react";
import { AlertCircle, Download, FileText, Files, Trash2 } from "lucide-react";

import { formatFileSize } from "@/shared/lib/format";
import { isApiError } from "@/shared/lib/api";
import { Button, ConfirmDialog, Drawer, Skeleton } from "@/shared/ui";

import { attachmentContentUrl } from "../api";
import { useAttachments, useDeleteAttachment } from "../hooks";
import type { ChatAttachment } from "../schemas";

/**
 * "Files (N)" — the chat's attachments in a right-hand drawer, with Download
 * and Delete. Deleting removes the file from this chat's knowledge base;
 * detaching a composer chip never does.
 */

export const FILES_PANEL_HINT =
  "Documents here are searched for every message in this chat. Images are sent with the message they were attached to.";

export function ChatFilesPanel({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = React.useState(false);
  const attachments = useAttachments(sessionId);
  const count = attachments.data?.length ?? 0;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={`Chat files (${count})`}
      >
        <Files aria-hidden />
        <span className="hidden sm:inline">Files ({count})</span>
      </Button>

      <Drawer
        open={open}
        onOpenChange={setOpen}
        title="Files in this chat"
        side="right"
        className="w-96"
      >
        <ChatFilesList
          sessionId={sessionId}
          attachments={attachments.data}
          isPending={attachments.isPending}
          error={attachments.error}
          onRetry={() => void attachments.refetch()}
        />
      </Drawer>
    </>
  );
}

export interface ChatFilesListProps {
  sessionId: string;
  attachments: ChatAttachment[] | undefined;
  isPending: boolean;
  error: unknown;
  onRetry?: () => void;
}

/** The drawer body; exported for tests. */
export function ChatFilesList({
  sessionId,
  attachments,
  isPending,
  error,
  onRetry,
}: ChatFilesListProps) {
  const remove = useDeleteAttachment(sessionId);
  const [pendingDelete, setPendingDelete] = React.useState<ChatAttachment | null>(null);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
      <p className="text-xs text-muted-foreground">{FILES_PANEL_HINT}</p>

      {isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : error ? (
        <div className="space-y-2 text-sm">
          <p role="alert" className="text-destructive">
            {isApiError(error) ? error.message : "Couldn't load this chat's files."}
          </p>
          {onRetry ? (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Try again
            </Button>
          ) : null}
        </div>
      ) : !attachments || attachments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <p className="text-sm font-medium text-foreground">No files yet</p>
          <p className="text-xs text-muted-foreground">
            Attach files with the paperclip in the composer, or drop them onto it.
          </p>
        </div>
      ) : (
        <ul aria-label="Chat files" className="space-y-2">
          {attachments.map((attachment) => (
            <FileItem
              key={attachment.id}
              sessionId={sessionId}
              attachment={attachment}
              onDelete={() => setPendingDelete(attachment)}
              deleting={remove.isPending && remove.variables === attachment.id}
            />
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(next) => (next ? undefined : setPendingDelete(null))}
        title="Delete this file?"
        description={`“${pendingDelete?.filename ?? ""}” will be removed from this chat. Its contents will no longer be searched for new messages.`}
        confirmLabel="Delete"
        loading={remove.isPending}
        onConfirm={() => {
          if (!pendingDelete) return;
          remove.mutate(pendingDelete.id, { onSettled: () => setPendingDelete(null) });
        }}
      />
    </div>
  );
}

function FileItem({
  sessionId,
  attachment,
  onDelete,
  deleting,
}: {
  sessionId: string;
  attachment: ChatAttachment;
  onDelete: () => void;
  deleting: boolean;
}) {
  const url = attachmentContentUrl(sessionId, attachment.id);
  const failed = attachment.status === "failed";
  const details = [
    formatFileSize(attachment.size_bytes),
    attachment.kind === "document" && attachment.chunk_count !== null
      ? `${attachment.chunk_count} chunk${attachment.chunk_count === 1 ? "" : "s"}`
      : null,
    attachment.kind === "image" ? "Image" : null,
    // Another tab's upload can still be parsing this document.
    attachment.status === "processing" ? "Processing…" : null,
  ].filter(Boolean);

  return (
    <li className="flex items-center gap-3 rounded-md border border-border p-2">
      {attachment.kind === "image" && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" loading="lazy" className="size-10 shrink-0 rounded object-cover" />
      ) : (
        <span className="flex size-10 shrink-0 items-center justify-center rounded bg-muted">
          <FileText aria-hidden className="size-5 text-muted-foreground" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground" title={attachment.filename}>
          {attachment.filename}
        </p>
        <p className="truncate text-xs text-muted-foreground">{details.join(" · ")}</p>
        {failed ? (
          <p className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle aria-hidden className="size-3 shrink-0" />
            <span className="truncate" title={attachment.error ?? undefined}>
              {attachment.error?.trim() || "Could not be processed"}
            </span>
          </p>
        ) : null}
      </div>
      <Button
        asChild
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        aria-label={`Download ${attachment.filename}`}
        title="Download"
      >
        <a href={url} download={attachment.filename}>
          <Download aria-hidden />
        </a>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        aria-label={`Delete ${attachment.filename}`}
        title="Delete"
        onClick={onDelete}
        loading={deleting}
      >
        <Trash2 aria-hidden />
      </Button>
    </li>
  );
}
