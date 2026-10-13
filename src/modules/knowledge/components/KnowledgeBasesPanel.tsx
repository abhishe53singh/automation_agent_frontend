"use client";

import * as React from "react";
import { Database, Plus, Settings, Trash2 } from "lucide-react";

import {
  useCreateKnowledgeBase,
  useDeleteKnowledgeBase,
  useKbDocuments,
  useKnowledgeBases,
  useUpdateKbDocument,
  useUpdateKnowledgeBase,
  useDetachKbDocument,
  useReplaceKbDocuments,
  useDocuments,
} from "../hooks";
import type { KnowledgeBase } from "../schemas";
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
} from "@/shared/ui";

// ─── Create KB dialog ─────────────────────────────────────────────────────────

const EMBEDDING_PROVIDERS = [
  "openai",
  "cohere",
  "voyage",
  "gemini",
  "azure-openai",
  "local",
] as const;

const PROVIDER_DEFAULT_MODELS: Record<string, string> = {
  openai: "text-embedding-3-small",
  cohere: "embed-english-v3.0",
  voyage: "voyage-3-lite",
  gemini: "text-embedding-004",
  "azure-openai": "text-embedding-3-small",
  local: "BAAI/bge-small-en-v1.5",
};

const PROVIDER_DEFAULT_DIMS: Record<string, number> = {
  openai: 1536,
  cohere: 1024,
  voyage: 512,
  gemini: 768,
  "azure-openai": 1536,
  local: 384,
};

function CreateKbDialog({ projectId, onClose }: { projectId?: string; onClose: () => void }) {
  const [form, setForm] = React.useState({
    name: "",
    description: "",
    embedding_provider: "openai",
    embedding_model: PROVIDER_DEFAULT_MODELS.openai ?? "",
    embedding_dimension: String(PROVIDER_DEFAULT_DIMS.openai ?? 1536),
    chunk_size: "1000",
    chunk_overlap: "200",
    default_top_k: "5",
  });
  const [error, setError] = React.useState<string>();
  const create = useCreateKnowledgeBase();

  const setField = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleProviderChange = (provider: string) => {
    setForm((prev) => ({
      ...prev,
      embedding_provider: provider,
      embedding_model: PROVIDER_DEFAULT_MODELS[provider] ?? prev.embedding_model,
      embedding_dimension: String(PROVIDER_DEFAULT_DIMS[provider] ?? prev.embedding_dimension),
    }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("A name is required.");
      return;
    }
    setError(undefined);
    create.mutate(
      {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        project_id: projectId,
        embedding_provider: form.embedding_provider,
        embedding_model: form.embedding_model,
        embedding_dimension: Number(form.embedding_dimension),
        chunk_size: form.chunk_size ? Number(form.chunk_size) : undefined,
        chunk_overlap: form.chunk_overlap ? Number(form.chunk_overlap) : undefined,
        default_top_k: form.default_top_k ? Number(form.default_top_k) : undefined,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Create knowledge base"
      description="Embedding settings are fixed at creation. Choose chunking carefully — they affect search quality."
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} loading={create.isPending}>
            Create
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Name"
          value={form.name}
          required
          autoFocus
          error={error}
          placeholder="my-knowledge-base"
          onChange={(e) => setField("name")(e.target.value)}
        />
        <div className="space-y-1">
          <label className="text-sm font-medium">Embedding provider</label>
          <select
            className="block w-full rounded border border-input bg-background px-3 py-2 text-sm"
            value={form.embedding_provider}
            onChange={(e) => handleProviderChange(e.target.value)}
          >
            {EMBEDDING_PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <Input
          label="Embedding model"
          value={form.embedding_model}
          placeholder="text-embedding-3-small"
          onChange={(e) => setField("embedding_model")(e.target.value)}
        />
        <Input
          label="Embedding dimension"
          value={form.embedding_dimension}
          inputMode="numeric"
          placeholder="1536"
          onChange={(e) => setField("embedding_dimension")(e.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Chunk size"
            value={form.chunk_size}
            inputMode="numeric"
            placeholder="1000"
            onChange={(e) => setField("chunk_size")(e.target.value)}
          />
          <Input
            label="Chunk overlap"
            value={form.chunk_overlap}
            inputMode="numeric"
            placeholder="200"
            onChange={(e) => setField("chunk_overlap")(e.target.value)}
          />
          <Input
            label="Default top-k"
            value={form.default_top_k}
            inputMode="numeric"
            placeholder="5"
            onChange={(e) => setField("default_top_k")(e.target.value)}
          />
        </div>
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Dialog>
  );
}

// ─── KB detail (settings + document management) ───────────────────────────────

function KbDetailDialog({ kb, onClose }: { kb: KnowledgeBase; onClose: () => void }) {
  const kbDocuments = useKbDocuments(kb.id);
  const allDocuments = useDocuments();
  const updateKbDoc = useUpdateKbDocument(kb.id);
  const detachKbDoc = useDetachKbDocument(kb.id);
  const replaceKbDocs = useReplaceKbDocuments(kb.id);
  const updateKb = useUpdateKnowledgeBase(kb.id);

  const attachedIds = new Set(kbDocuments.data?.map((d) => d.document_id) ?? []);
  const availableDocuments = (allDocuments.data ?? []).filter((d) => !attachedIds.has(d.id));

  const handleAttach = (documentId: string) => {
    const current = kbDocuments.data?.map((d) => d.document_id) ?? [];
    replaceKbDocs.mutate([...current, documentId]);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={`KB: ${kb.name}`}
      description={`Provider: ${kb.embedding_provider} · Model: ${kb.embedding_model} · Dim: ${kb.embedding_dimension}`}
    >

      <div className="space-y-4">
        {/* Settings row */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Default top-k</p>
            <p className="text-sm">{kb.default_top_k}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Min score</p>
            <p className="text-sm">{kb.min_score ?? "—"}</p>
          </div>
        </div>

        {/* Active toggle */}
        <div className="flex items-center justify-between rounded border border-border p-3">
          <span className="text-sm">Active</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            loading={updateKb.isPending}
            onClick={() => updateKb.mutate({ is_active: !kb.is_active })}
          >
            {kb.is_active ? "Deactivate" : "Activate"}
          </Button>
        </div>

        {/* Attached documents */}
        <div>
          <p className="mb-2 text-sm font-medium">Attached documents</p>
          {kbDocuments.isPending ? (
            <Skeleton className="h-12 w-full" />
          ) : (kbDocuments.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents attached.</p>
          ) : (
            <ul className="divide-y divide-border">
              {(kbDocuments.data ?? []).map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      {entry.document?.title ?? entry.document_id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.document?.chunk_count ?? "?"} chunks
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      loading={updateKbDoc.isPending}
                      onClick={() =>
                        updateKbDoc.mutate({
                          documentId: entry.document_id,
                          is_enabled: !entry.is_enabled,
                        })
                      }
                    >
                      {entry.is_enabled ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      loading={detachKbDoc.isPending}
                      onClick={() => detachKbDoc.mutate(entry.document_id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Attach more documents */}
        {availableDocuments.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium">Attach a document</p>
            <select
              className="block w-full rounded border border-input bg-background px-3 py-2 text-sm"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) handleAttach(e.target.value);
                e.target.value = "";
              }}
            >
              <option value="">Choose a document to attach…</option>
              {availableDocuments.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </Dialog>
  );
}

// ─── KB row ───────────────────────────────────────────────────────────────────

function KbRow({ kb }: { kb: KnowledgeBase }) {
  const [managing, setManaging] = React.useState(false);
  const remove = useDeleteKnowledgeBase();

  return (
    <>
      <li className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <p className="truncate text-sm font-medium">{kb.name}</p>
            {!kb.is_active && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                inactive
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {kb.embedding_provider} · {kb.embedding_model} · dim {kb.embedding_dimension}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button type="button" variant="outline" size="sm" onClick={() => setManaging(true)}>
            <Settings className="h-3.5 w-3.5" aria-hidden />
            Manage
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            loading={remove.isPending}
            onClick={() => remove.mutate(kb.id)}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      </li>
      {managing && <KbDetailDialog kb={kb} onClose={() => setManaging(false)} />}
    </>
  );
}

// ─── Knowledge bases panel ────────────────────────────────────────────────────

export function KnowledgeBasesPanel({ projectId }: { projectId?: string }) {
  const [creating, setCreating] = React.useState(false);
  const kbs = useKnowledgeBases();

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1.5">
              <CardTitle>Knowledge Bases</CardTitle>
              <CardDescription>
                Vector stores for semantic search. Embedding settings are fixed at creation.
              </CardDescription>
            </div>
            <Button type="button" onClick={() => setCreating(true)}>
              <Plus aria-hidden />
              Add knowledge base
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <AsyncBoundary
            isPending={kbs.isPending}
            error={kbs.error}
            isEmpty={(kbs.data ?? []).length === 0}
            skeleton={
              <div className="space-y-2">
                {Array.from({ length: 2 }, (_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            }
            onRetry={() => void kbs.refetch()}
            empty={
              <p className="text-sm text-muted-foreground">
                No knowledge bases yet. Create one to enable semantic search.
              </p>
            }
          >
            <ul className="divide-y divide-border">
              {(kbs.data ?? []).map((kb) => (
                <KbRow key={kb.id} kb={kb} />
              ))}
            </ul>
          </AsyncBoundary>
        </CardContent>
      </Card>

      {creating && (
        <CreateKbDialog projectId={projectId} onClose={() => setCreating(false)} />
      )}
    </>
  );
}

