"use client";

import * as React from "react";
import { Upload } from "lucide-react";

import { Button } from "@/shared/ui";
import { hasSupportedExtension } from "../schemas";
import { useSupportedTypes, useUploadFile } from "../hooks";

/**
 * Drag-drop upload zone + file picker (phase 5 item 41).
 * projectId comes from the route (law #2 — never typed).
 * Client-validates the extension against supported-types; 413/415/400
 * surface inline under the zone with the draft preserved.
 */

export function FileUploadZone({ projectId }: { projectId?: string }) {
  const supported = useSupportedTypes();
  const upload = useUploadFile({ projectId });
  const [dragOver, setDragOver] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const allowList = supported.data ?? [];
  const accept = allowList.length > 0 ? allowList.join(",") : undefined;

  const send = React.useCallback(
    (file: File | undefined) => {
      setLocalError(null);
      if (!file) return;
      if (file.size === 0) {
        setLocalError("That file is empty — choose a file with content.");
        return;
      }
      if (allowList.length > 0 && !hasSupportedExtension(file.name, allowList)) {
        setLocalError(
          `“${file.name}” is not a supported type. Supported: ${allowList.join(", ")}.`,
        );
        return;
      }
      upload.mutate(file);
    },
    [allowList, upload],
  );

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload files"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          send(event.dataTransfer.files?.[0]);
        }}
        className={
          dragOver
            ? "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary bg-primary/5 p-8 text-center"
            : "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-8 text-center hover:border-primary/50"
        }
      >
        <Upload aria-hidden className="size-6 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">
          {upload.isPending ? "Uploading…" : "Drop a file here, or browse"}
        </p>
        <p className="max-w-md text-xs text-muted-foreground">
          {supported.isPending
            ? "Checking supported file types…"
            : allowList.length > 0
              ? `Supported: ${allowList.join(", ")}`
              : "Upload a knowledge file."}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="sr-only"
          aria-hidden={false}
          onChange={(event) => {
            send(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <Button type="button" size="sm" disabled={upload.isPending}>
          {upload.isPending ? "Uploading…" : "Choose file"}
        </Button>
      </div>
      {localError || upload.error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {localError ?? (upload.error instanceof Error ? upload.error.message : "Upload failed.")}
        </p>
      ) : null}
    </div>
  );
}
