"use client";

import * as React from "react";
import { AlertCircle, FileText, Image as ImageIcon, Loader2, X } from "lucide-react";

import { formatFileSize } from "@/shared/lib/format";
import { cn } from "@/shared/lib/cn";

import { attachmentContentUrl } from "../api";
import type { ChatAttachment } from "../schemas";
import type { PendingAttachment } from "../use-composer-attachments";

/**
 * Attachment chips: the composer's pending uploads and the read-only chips
 * shown in a sent message's bubble. Presentational only.
 */

const CHIP_CLASS =
  "inline-flex max-w-[16rem] items-center gap-1.5 rounded-md border border-border bg-secondary py-1 pl-1.5 pr-0.5 text-xs text-secondary-foreground";

export interface AttachmentChipsProps {
  items: PendingAttachment[];
  onRemove: (key: string) => void;
  disabled?: boolean;
  className?: string;
}

/** The composer's chips (uploading / ready / failed). Renders nothing when empty. */
export function AttachmentChips({ items, onRemove, disabled, className }: AttachmentChipsProps) {
  if (items.length === 0) return null;
  return (
    <ul aria-label="Attached files" className={cn("flex flex-wrap gap-1.5", className)}>
      {items.map((item) => {
        const failed = item.status === "failed";
        const uploading = item.status === "uploading";
        return (
          <li
            key={item.key}
            data-status={item.status}
            title={failed ? (item.error ?? "Upload failed") : item.name}
            className={cn(CHIP_CLASS, failed && "border-destructive/50 bg-destructive/5")}
          >
            {item.kind === "image" && item.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.previewUrl}
                alt=""
                className={cn("size-7 shrink-0 rounded object-cover", uploading && "opacity-60")}
              />
            ) : item.kind === "image" ? (
              <ImageIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            ) : (
              <FileText aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            )}
            <span className="min-w-0">
              <span className="block truncate font-medium">{item.name}</span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {uploading
                  ? "Uploading…"
                  : failed
                    ? (item.error ?? "Failed")
                    : formatFileSize(item.size)}
              </span>
            </span>
            {uploading ? (
              <Loader2
                aria-label={`Uploading ${item.name}`}
                className="size-3.5 shrink-0 animate-spin text-muted-foreground"
              />
            ) : failed ? (
              <AlertCircle
                aria-label={`${item.name} failed: ${item.error ?? "Upload failed"}`}
                className="size-3.5 shrink-0 text-destructive"
              />
            ) : null}
            <button
              type="button"
              onClick={() => onRemove(item.key)}
              disabled={disabled}
              aria-label={`Remove file ${item.name}`}
              className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <X aria-hidden className="size-3" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export interface TurnAttachmentsProps {
  sessionId: string;
  ids: string[];
  /** The chat's attachments by id. */
  byId: ReadonlyMap<string, ChatAttachment>;
  /** False while the list is still loading (unknown ids are not "removed" yet). */
  loaded: boolean;
}

/** A sent message's attachments, inside the (primary-coloured) user bubble. */
export function TurnAttachments({ sessionId, ids, byId, loaded }: TurnAttachmentsProps) {
  if (ids.length === 0) return null;
  return (
    <ul aria-label="Message attachments" className="mt-2 flex flex-wrap gap-1.5">
      {ids.map((attachmentId) => {
        const attachment = byId.get(attachmentId);
        if (!attachment) {
          return (
            <li
              key={attachmentId}
              className="inline-flex items-center gap-1 rounded-md bg-primary-foreground/10 px-2 py-1 text-xs italic text-primary-foreground/80"
            >
              <FileText aria-hidden className="size-3.5" />
              {loaded ? "Removed file" : "File"}
            </li>
          );
        }
        const url = attachmentContentUrl(sessionId, attachment.id);
        if (attachment.kind === "image" && attachment.status === "ready") {
          return (
            <li key={attachmentId}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                title={attachment.filename}
                aria-label={`Open image ${attachment.filename}`}
                className="block overflow-hidden rounded-md border border-primary-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={attachment.filename}
                  loading="lazy"
                  className="size-20 object-cover"
                />
              </a>
            </li>
          );
        }
        return (
          <li key={attachmentId}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              title={attachment.filename}
              className="inline-flex max-w-[16rem] items-center gap-1.5 rounded-md bg-primary-foreground/10 px-2 py-1 text-xs text-primary-foreground hover:bg-primary-foreground/20"
            >
              <FileText aria-hidden className="size-3.5 shrink-0" />
              <span className="truncate">{attachment.filename}</span>
              <span className="shrink-0 text-primary-foreground/70">
                {formatFileSize(attachment.size_bytes)}
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
