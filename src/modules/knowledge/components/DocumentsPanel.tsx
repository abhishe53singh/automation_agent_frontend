"use client";

import * as React from "react";
import { FileText, Plus, RefreshCw, Trash2 } from "lucide-react";

import {
  useCreateDocument,
  useDeleteDocument,
  useDocumentChunks,
  useDocuments,
  useReindexDocument,
} from "../hooks";
import { deriveDocumentTitle, type DocumentStatus, type KnowledgeDocument } from "../schemas";

import { AsyncBoundary } from "@/shared/ui/AsyncBoundary";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  Input,
  Skeleton,
  Textarea,
} from "@/shared/ui";

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<DocumentStatus, string> = {
  pending: "text-muted-foreground bg-muted",
  parsed: "text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30",
  chunked: "text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/30",
  embedded: "text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30",
  failed: "text-destructive bg-destructive/10",
};

function StatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? "text-muted-foreground bg-muted"}`}
    >
      {status}
    </span>
  );
}

// ─── Chunk viewer ─────────────────────────────────────────────────────────────

function ChunkViewer({ documentId, onClose }: { documentId: string; onClose: () => void }) {
  const chunks = useDocumentChunks(documentId);

  return (
    <Dialog
      open
      onClose={onClose}
      title="Document chunks"
      description="Each chunk is a text segment that was embedded for search."
    >
      <AsyncBoundary
        isPending={chunks.isPending}
        error={chunks.error}
        isEmpty={(chunks.data ?? []).length === 0}
        skeleton={
          <div className="space-y-2">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        }
        onRetry={() => void chunks.refetch()}
        empty={<p className="text-sm text-muted-foreground">No chunks yet — ingest the document.</p>}
      >
        <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
          {(chunks.data ?? []).map((chunk) => (
            <div key={chunk.id} className="rounded border border-border p-3">
              <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span>#{chunk.chunk_index + 1}</span>
                {chunk.heading && <span className="font-medium text-foreground">{chunk.heading}</span>}
                <span className="ml-auto">{chunk.token_count} tok</span>
              </div>
              <p className="text-sm leading-relaxed">{chunk.content}</p>
            </div>
          ))}
        </div>
      </AsyncBoundary>
    </Dialog>
  );
}

// ─── Create document dialog ───────────────────────────────────────────────────

function CreateDocumentDialog({
  projectId,
  onClose,
}: {
  projectId?: string;
  onClose: () => void;
}) {
  const [text, setText] = React.useState("");
  const [title, setTitle] = React.useState("");
  const create = useCreateDocument({ projectId });

  const handleTextChange = (value: string) => {
    setText(value);
    if (!title.trim()) setTitle(deriveDocumentTitle(value));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    create.mutate(
      { title: title.trim() || deriveDocumentTitle(text), text },
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Create document from text"
      description="Paste or type text. It will be chunked and embedded for search."
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} loading={create.isPending}>
            Create document
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Title"
          value={title}
          placeholder="Auto-derived from text"
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="space-y-1">
          <label className="text-sm font-medium">Text</label>
          <Textarea
            value={text}
            rows={8}
            placeholder="Paste or type document text…"
            onChange={(e) => handleTextChange(e.target.value)}
          />
        </div>
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Dialog>
  );
}

// ─── Document row ─────────────────────────────────────────────────────────────

function DocumentRow({ document }: { document: KnowledgeDocument }) {
  const [viewingChunks, setViewingChunks] = React.useState(false);
  const remove = useDeleteDocument();
  const reindex = useReindexDocument(document.id);

  return (
    <>
      <li className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <p className="truncate text-sm font-medium">{document.title}</p>
            <StatusBadge status={document.status} />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {document.chunk_count} chunk{document.chunk_count === 1 ? "" : "s"} ·{" "}
            {document.word_count.toLocaleString("en-US")} words · {document.source_type}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setViewingChunks(true)}
          >
            Chunks
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={reindex.isPending}
            title="Re-chunk and re-embed"
            onClick={() => reindex.mutate({})}
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            loading={remove.isPending}
            onClick={() => remove.mutate(document.id)}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      </li>
      {viewingChunks && (
        <ChunkViewer documentId={document.id} onClose={() => setViewingChunks(false)} />
      )}
    </>
  );
}

// ─── Documents panel ──────────────────────────────────────────────────────────

export function DocumentsPanel({ projectId }: { projectId?: string }) {
  const [creating, setCreating] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const documents = useDocuments({ projectId, status: statusFilter || undefined });

  const statuses = ["", "pending", "parsed", "chunked", "embedded", "failed"];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1.5">
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                Text documents available for search. Create from inline text or ingest files.
              </CardDescription>
            </div>
            <Button type="button" onClick={() => setCreating(true)}>
              <Plus aria-hidden />
              Add document
            </Button>
          </div>
          {/* Status filter pills */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {statuses.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {s === "" ? "All" : s}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <AsyncBoundary
            isPending={documents.isPending}
            error={documents.error}
            isEmpty={(documents.data ?? []).length === 0}
            skeleton={
              <div className="space-y-2">
                {Array.from({ length: 3 }, (_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            }
            onRetry={() => void documents.refetch()}
            empty={
              <p className="text-sm text-muted-foreground">
                No documents yet. Create one from inline text or ingest an uploaded file.
              </p>
            }
          >
            <ul className="divide-y divide-border">
              {(documents.data ?? []).map((doc) => (
                <DocumentRow key={doc.id} document={doc} />
              ))}
            </ul>
          </AsyncBoundary>
        </CardContent>
      </Card>

      {creating && (
        <CreateDocumentDialog projectId={projectId} onClose={() => setCreating(false)} />
      )}
    </>
  );
}

