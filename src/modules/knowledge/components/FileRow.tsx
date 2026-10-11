"use client";

import * as React from "react";
import { Download, MoreHorizontal, Pencil, RefreshCw, Trash2 } from "lucide-react";

import { formatFileSize } from "@/shared/lib/format";
import {
  Badge,
  Button,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  RelativeTime,
} from "@/shared/ui";

import { downloadFile } from "../api";
import { useDeleteFile, useFileJobs, useRenameFile } from "../hooks";
import type { KnowledgeFile } from "../schemas";
import { jobStatusLabel, jobStatusVariant } from "./job-status";
import { IngestMenuItems } from "./IngestMenuItems";

export function FileRow({ file }: { file: KnowledgeFile }) {
  const [renaming, setRenaming] = React.useState(false);
  const [draft, setDraft] = React.useState(file.filename);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);

  const rename = useRenameFile(file.id);
  const remove = useDeleteFile();
  const jobs = useFileJobs(file.id);
  const latestJob = jobs.data?.[0];

  const onDownload = async () => {
    setDownloading(true);
    try {
      const response = await downloadFile(file.id);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      // Silent — the envelope toast owns mutation errors.
    } finally {
      setDownloading(false);
    }
  };

  const saveRename = () => {
    const name = draft.trim();
    if (!name || name === file.filename) {
      setRenaming(false);
      setDraft(file.filename);
      return;
    }
    rename.mutate({ filename: name }, { onSuccess: () => setRenaming(false) });
  };

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        {renaming ? (
          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              saveRename();
            }}
          >
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={255}
              aria-label="File name"
              autoFocus
              disabled={rename.isPending}
              className="h-8"
            />
            <Button type="submit" size="sm" disabled={rename.isPending || !draft.trim()}>
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setRenaming(false);
                setDraft(file.filename);
              }}
            >
              Cancel
            </Button>
          </form>
        ) : (
          <p className="truncate text-sm font-medium text-foreground" title={file.filename}>
            {file.filename}
          </p>
        )}
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span>{formatFileSize(file.size_bytes)}</span>
          <span aria-hidden>·</span>
          <RelativeTime dateTime={file.updated_at} />
          <span aria-hidden>·</span>
          {latestJob ? (
            <>
              <Badge variant={jobStatusVariant(latestJob.status)}>
                {jobStatusLabel(latestJob.status)}
              </Badge>
              {latestJob.status === "running" || latestJob.status === "pending" ? (
                <span className="text-xs">{latestJob.stage || "Working…"}</span>
              ) : null}
            </>
          ) : (
            <Badge variant={jobStatusVariant(file.status)}>{jobStatusLabel(file.status)}</Badge>
          )}
        </p>
        {latestJob?.status === "failed" && latestJob.error_message ? (
          <p role="alert" className="mt-1 text-xs text-destructive">
            {latestJob.error_message}
          </p>
        ) : null}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Actions for ${file.filename}`}
            className="size-10 shrink-0 [@media(hover:hover)]:size-8"
          >
            <MoreHorizontal aria-hidden className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => void onDownload()} disabled={downloading}>
            <Download aria-hidden /> {downloading ? "Downloading…" : "Download"}
          </DropdownMenuItem>
          <IngestMenuItems fileId={file.id} jobStatus={latestJob?.status} />
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              setDraft(file.filename);
              setRenaming(true);
            }}
          >
            <Pencil aria-hidden /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setConfirmDelete(true)}>
            <Trash2 aria-hidden /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete “${file.filename}”?`}
        description="This removes the file and everything made from it. This can't be undone."
        confirmLabel="Delete"
        variant="destructive"
        loading={remove.isPending}
        onConfirm={() => remove.mutate(file.id, { onSuccess: () => setConfirmDelete(false) })}
      />
    </li>
  );
}
