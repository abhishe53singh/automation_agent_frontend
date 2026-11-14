"use client";

import * as React from "react";
import { toast } from "sonner";

import { useAttachmentTypes } from "./hooks";
import { fileExtension, filterAttachmentFiles, type ChatAttachmentKind } from "./schemas";
import type { PendingAttachment } from "./use-composer-attachments";

/**
 * Attachments picked on the NEW-chat screen, before the chat exists.
 *
 * An open chat uploads files the moment they are picked
 * (`useComposerAttachments`), but uploads belong to a chat and a new chat
 * has no id until the first Send. So here the files stay in the browser as
 * chips; Send creates the chat, uploads them into it (they become that
 * chat's private context: documents are searched only in that chat, images
 * go to the model with the message) and then sends the message with them.
 *
 * Chips use the same `PendingAttachment` shape (status "ready" = queued) so
 * the shared `AttachmentChips` renders them.
 */
export interface DraftAttachments {
  items: PendingAttachment[];
  /** The queued files, in chip order, for the upload on Send. */
  files: File[];
  addFiles: (files: readonly File[]) => void;
  remove: (key: string) => void;
  clear: () => void;
  /** `accept` attribute for the file input (undefined until types load). */
  accept: string | undefined;
}

let keySeed = 0;
const nextKey = () => `draft-${Date.now().toString(36)}-${(keySeed += 1)}`;

function revoke(url: string | null) {
  if (url?.startsWith("blob:") && typeof URL.revokeObjectURL === "function") {
    URL.revokeObjectURL(url);
  }
}

export function useDraftAttachments(): DraftAttachments {
  const types = useAttachmentTypes();
  const [entries, setEntries] = React.useState<{ item: PendingAttachment; file: File }[]>([]);
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

  const addFiles = React.useCallback(
    (files: readonly File[]) => {
      if (files.length === 0) return;
      const { accepted, rejected } = filterAttachmentFiles(files, types.data);
      for (const { file, reason } of rejected) {
        toast.error(`“${file.name}” ${reason}.`);
      }
      if (accepted.length === 0) return;
      const added = accepted.map((file) => {
        const kind: ChatAttachmentKind =
          file.type.startsWith("image/") || imageExtensions.has(fileExtension(file.name))
            ? "image"
            : "document";
        let previewUrl: string | null = null;
        if (kind === "image" && typeof URL?.createObjectURL === "function") {
          previewUrl = URL.createObjectURL(file);
          objectUrls.current.add(previewUrl);
        }
        const item: PendingAttachment = {
          key: nextKey(),
          name: file.name,
          size: file.size,
          kind,
          status: "ready",
          previewUrl,
          attachment: null,
          error: null,
        };
        return { item, file };
      });
      setEntries((previous) => [...previous, ...added]);
    },
    [imageExtensions, types.data],
  );

  const remove = React.useCallback((key: string) => {
    setEntries((previous) => {
      const target = previous.find((entry) => entry.item.key === key);
      if (target?.item.previewUrl) {
        objectUrls.current.delete(target.item.previewUrl);
        revoke(target.item.previewUrl);
      }
      return previous.filter((entry) => entry.item.key !== key);
    });
  }, []);

  const clear = React.useCallback(() => {
    setEntries((previous) => {
      for (const { item } of previous) {
        if (item.previewUrl) {
          objectUrls.current.delete(item.previewUrl);
          revoke(item.previewUrl);
        }
      }
      return [];
    });
  }, []);

  const items = React.useMemo(() => entries.map((entry) => entry.item), [entries]);
  const files = React.useMemo(() => entries.map((entry) => entry.file), [entries]);

  const accept = types.data
    ? [...types.data.document_extensions, ...types.data.image_extensions].join(",")
    : undefined;

  return { items, files, addFiles, remove, clear, accept };
}
