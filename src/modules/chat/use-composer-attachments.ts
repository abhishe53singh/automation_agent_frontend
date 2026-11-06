"use client";

import * as React from "react";
import { toast } from "sonner";

import { isApiError } from "@/shared/lib/api";

import { attachmentContentUrl } from "./api";
import { useAttachmentTypes, useUploadAttachments } from "./hooks";
import {
  fileExtension,
  filterAttachmentFiles,
  type ChatAttachment,
  type ChatAttachmentKind,
} from "./schemas";

/**
 * The composer's not-yet-sent attachments ("chips").
 *
 * Files upload IMMEDIATELY on selection — one request per batch — so they are
 * parsed and embedded while the user is still typing. Each chip moves
 * `uploading` -> `ready` | `failed`. Removing a chip only detaches it from the
 * next message: the upload itself stays in the chat's file list (deleting is
 * the Files panel's job).
 */

export type PendingAttachmentStatus = "uploading" | "ready" | "failed";

export interface PendingAttachment {
  /** Local key; stable across the upload. */
  key: string;
  name: string;
  size: number;
  kind: ChatAttachmentKind;
  status: PendingAttachmentStatus;
  /** Thumbnail source for images: the local object URL, then the content URL. */
  previewUrl: string | null;
  /** The server row once the batch answered. */
  attachment: ChatAttachment | null;
  error: string | null;
}

export interface ComposerAttachments {
  items: PendingAttachment[];
  /** Pick, drop or paste: validates, then uploads the accepted files as one batch. */
  addFiles: (files: readonly File[]) => void;
  remove: (key: string) => void;
  /** Drop every chip (after a send). */
  clear: () => void;
  /** Ids of the chips that are ready to go with the next message. */
  readyIds: string[];
  isUploading: boolean;
  /** `accept` attribute for the file input (undefined until types load). */
  accept: string | undefined;
}

let keySeed = 0;
const nextKey = () => `att-${Date.now().toString(36)}-${(keySeed += 1)}`;

function canMakeObjectUrl(): boolean {
  return typeof URL !== "undefined" && typeof URL.createObjectURL === "function";
}

function revoke(url: string | null) {
  if (url?.startsWith("blob:") && typeof URL.revokeObjectURL === "function") {
    URL.revokeObjectURL(url);
  }
}

export function useComposerAttachments(sessionId: string): ComposerAttachments {
  const types = useAttachmentTypes();
  const { mutateAsync: upload } = useUploadAttachments(sessionId);
  const [items, setItems] = React.useState<PendingAttachment[]>([]);
  /** Mirror of the object URLs we own, for cleanup on unmount. */
  const objectUrls = React.useRef(new Set<string>());

  React.useEffect(() => {
    const urls = objectUrls.current;
    return () => {
      for (const url of urls) revoke(url);
      urls.clear();
    };
  }, []);

  const imageExtensions = React.useMemo(
    () => new Set((types.data?.image_extensions ?? []).map((ext) => ext.toLowerCase())),
    [types.data],
  );

  const kindOf = React.useCallback(
    (file: File): ChatAttachmentKind =>
      file.type.startsWith("image/") || imageExtensions.has(fileExtension(file.name))
        ? "image"
        : "document",
    [imageExtensions],
  );

  const release = React.useCallback((url: string | null) => {
    if (url) objectUrls.current.delete(url);
    revoke(url);
  }, []);

  const addFiles = React.useCallback(
    (files: readonly File[]) => {
      if (files.length === 0) return;
      const { accepted, rejected } = filterAttachmentFiles(files, types.data);
      for (const { file, reason } of rejected) {
        toast.error(`“${file.name}” ${reason}.`);
      }
      if (accepted.length === 0) return;

      const batch: PendingAttachment[] = accepted.map((file) => {
        const kind = kindOf(file);
        let previewUrl: string | null = null;
        if (kind === "image" && canMakeObjectUrl()) {
          previewUrl = URL.createObjectURL(file);
          objectUrls.current.add(previewUrl);
        }
        return {
          key: nextKey(),
          name: file.name,
          size: file.size,
          kind,
          status: "uploading",
          previewUrl,
          attachment: null,
          error: null,
        };
      });
      setItems((previous) => [...previous, ...batch]);

      const settle = (update: (item: PendingAttachment, index: number) => PendingAttachment) => {
        const keys = new Map(batch.map((item, index) => [item.key, index]));
        setItems((previous) =>
          previous.map((item) => {
            const index = keys.get(item.key);
            return index === undefined ? item : update(item, index);
          }),
        );
      };

      upload(accepted)
        .then((rows) => {
          // Rows come back in upload order; fall back to the filename.
          const used = new Set<number>();
          settle((item, index) => {
            let row: ChatAttachment | undefined = rows[index];
            if (!row || row.filename !== item.name) {
              const found = rows.findIndex((r, i) => !used.has(i) && r.filename === item.name);
              row = found >= 0 ? rows[found] : row;
              if (found >= 0) used.add(found);
            } else {
              used.add(index);
            }
            if (!row) {
              release(item.previewUrl);
              return {
                ...item,
                status: "failed",
                previewUrl: null,
                error: "The server did not return this file.",
              };
            }
            const ready = row.status === "ready";
            const previewUrl =
              item.kind === "image" && ready ? attachmentContentUrl(sessionId, row.id) : null;
            release(item.previewUrl);
            return {
              ...item,
              kind: row.kind,
              status: ready ? "ready" : "failed",
              attachment: row,
              previewUrl,
              error: ready ? null : row.error?.trim() || "This file could not be processed.",
            };
          });
          const failed = rows.filter((row) => row.status === "failed").length;
          if (failed > 0) {
            toast.error(
              failed === 1 ? "One file could not be processed." : `${failed} files failed.`,
            );
          }
        })
        .catch((error: unknown) => {
          const message = isApiError(error) ? error.message : "Upload failed.";
          settle((item) => ({ ...item, status: "failed", error: message }));
          toast.error(message);
        });
    },
    [kindOf, release, sessionId, types.data, upload],
  );

  const remove = React.useCallback(
    (key: string) => {
      setItems((previous) => {
        const target = previous.find((item) => item.key === key);
        if (target) release(target.previewUrl);
        return previous.filter((item) => item.key !== key);
      });
    },
    [release],
  );

  const clear = React.useCallback(() => {
    setItems((previous) => {
      for (const item of previous) release(item.previewUrl);
      return [];
    });
  }, [release]);

  const readyIds = React.useMemo(
    () =>
      items
        .filter((item) => item.status === "ready" && item.attachment)
        .map((item) => (item.attachment as ChatAttachment).id),
    [items],
  );

  const accept = types.data
    ? [...types.data.document_extensions, ...types.data.image_extensions].join(",")
    : undefined;

  return {
    items,
    addFiles,
    remove,
    clear,
    readyIds,
    isUploading: items.some((item) => item.status === "uploading"),
    accept,
  };
}
