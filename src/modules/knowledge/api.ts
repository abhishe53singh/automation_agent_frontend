import { z } from "zod";

import { TIMEOUTS, apiFetch, apiJson, apiVoid, definedOnly, parseWith } from "@/shared/lib/api";

import {
  citationCreateSchema,
  citationSchema,
  documentChunkSchema,
  documentCreateSchema,
  documentReindexSchema,
  documentUpdateSchema,
  fileIngestSchema,
  fileUpdateSchema,
  indexResultSchema,
  ingestionJobCreateSchema,
  ingestionJobResultSchema,
  ingestionJobSchema,
  kbDocumentEntrySchema,
  knowledgeBaseCreateSchema,
  knowledgeBaseSchema,
  knowledgeBaseUpdateSchema,
  knowledgeDocumentSchema,
  knowledgeFileSchema,
  retrievalResultSchema,
  retrievalSchema,
  searchRequestSchema,
  searchResponseSchema,
  type Citation,
  type CitationCreate,
  type DocumentChunk,
  type DocumentCreate,
  type DocumentReindex,
  type DocumentUpdate,
  type FileIngest,
  type FileUpdate,
  type IndexResult,
  type IngestionJob,
  type IngestionJobCreate,
  type IngestionJobResult,
  type KbDocumentEntry,
  type KnowledgeBase,
  type KnowledgeBaseCreate,
  type KnowledgeBaseUpdate,
  type KnowledgeDocument,
  type KnowledgeFile,
  type Retrieval,
  type RetrievalResult,
  type SearchRequest,
  type SearchResponse,
} from "./schemas";

// ─── Filter interfaces ────────────────────────────────────────────────────────

export interface FileListFilters {
  projectId?: string;
}

export interface JobListFilters {
  fileId?: string;
  status?: string;
}

export interface DocumentListFilters {
  projectId?: string;
  status?: string;
}

// ─── Query key factories ──────────────────────────────────────────────────────

export const knowledgeKeys = {
  all: ["knowledge"] as const,
  files: (filters?: FileListFilters) => ["knowledge", "files", filters ?? {}] as const,
  file: (fileId: string) => ["knowledge", "file", fileId] as const,
  jobs: (filters?: JobListFilters) => ["knowledge", "jobs", filters ?? {}] as const,
  job: (jobId: string) => ["knowledge", "job", jobId] as const,
  supportedTypes: () => ["knowledge", "supported-types"] as const,
};

export const documentKeys = {
  documents: (filters?: DocumentListFilters) => ["knowledge", "documents", filters ?? {}] as const,
  document: (documentId: string) => ["knowledge", "document", documentId] as const,
  chunks: (documentId: string) => ["knowledge", "document", documentId, "chunks"] as const,
  chunkCount: (documentId: string) =>
    ["knowledge", "document", documentId, "chunk-count"] as const,
};

export const kbKeys = {
  bases: () => ["knowledge", "knowledge-bases"] as const,
  base: (kbId: string) => ["knowledge", "knowledge-base", kbId] as const,
  kbDocuments: (kbId: string) => ["knowledge", "knowledge-base", kbId, "documents"] as const,
  retrievals: () => ["knowledge", "retrievals"] as const,
  retrieval: (retrievalId: string) => ["knowledge", "retrieval", retrievalId] as const,
  retrievalResults: (retrievalId: string) =>
    ["knowledge", "retrieval", retrievalId, "results"] as const,
  citations: (filters?: { responseId?: string; retrievalId?: string }) =>
    ["knowledge", "citations", filters ?? {}] as const,
  citation: (citationId: string) => ["knowledge", "citation", citationId] as const,
};

// ─── Zod list schemas ─────────────────────────────────────────────────────────

const fileListSchema = z.array(knowledgeFileSchema);
const jobListSchema = z.array(ingestionJobSchema);
const supportedTypesSchema = z.array(z.string());
const documentListSchema = z.array(knowledgeDocumentSchema);
const documentChunkListSchema = z.array(documentChunkSchema);
const kbListSchema = z.array(knowledgeBaseSchema);
const kbDocumentListSchema = z.array(kbDocumentEntrySchema);
const retrievalListSchema = z.array(retrievalSchema);
const retrievalResultListSchema = z.array(retrievalResultSchema);
const citationListSchema = z.array(citationSchema);

const enc = (value: string) => encodeURIComponent(value);

// ─── Files ────────────────────────────────────────────────────────────────────

export function listFiles(
  options: { projectId?: string } = {},
  signal?: AbortSignal,
): Promise<KnowledgeFile[]> {
  return apiJson(
    "/api/files",
    { signal, query: { projectId: options.projectId } },
    (value) => parseWith(fileListSchema, value, "GET /api/files"),
  );
}

export function getFile(fileId: string, signal?: AbortSignal): Promise<KnowledgeFile> {
  return apiJson(`/api/files/${enc(fileId)}`, { signal }, (value) =>
    parseWith(knowledgeFileSchema, value, "GET /api/files/{id}"),
  );
}

export function uploadFile(
  file: File,
  options: { projectId?: string } = {},
  signal?: AbortSignal,
): Promise<KnowledgeFile> {
  const form = new FormData();
  form.append("file", file, file.name);
  if (options.projectId) form.append("project_id", options.projectId);
  return apiJson(
    "/api/files",
    { method: "POST", body: form, signal, timeoutMs: TIMEOUTS.upload },
    (value) => parseWith(knowledgeFileSchema, value, "POST /api/files"),
  );
}

export function updateFile(
  fileId: string,
  input: FileUpdate,
  signal?: AbortSignal,
): Promise<KnowledgeFile> {
  const parsed = fileUpdateSchema.parse(input);
  return apiJson(
    `/api/files/${enc(fileId)}`,
    {
      method: "PATCH",
      body: definedOnly(parsed as Record<string, unknown>),
      signal,
      timeoutMs: TIMEOUTS.mutation,
    },
    (value) => parseWith(knowledgeFileSchema, value, "PATCH /api/files/{id}"),
  );
}

export function deleteFile(fileId: string, signal?: AbortSignal): Promise<void> {
  return apiVoid(`/api/files/${enc(fileId)}`, { method: "DELETE", signal });
}

export function downloadFile(fileId: string, signal?: AbortSignal): Promise<Response> {
  return apiFetch(`/api/files/${enc(fileId)}/download`, { signal, raw: true });
}

export function ingestFile(
  fileId: string,
  input: FileIngest = {},
  signal?: AbortSignal,
): Promise<IngestionJobResult> {
  const parsed = fileIngestSchema.parse(input);
  return apiJson(
    `/api/files/${enc(fileId)}/ingest`,
    {
      method: "POST",
      body: definedOnly(parsed as Record<string, unknown>),
      signal,
      timeoutMs: TIMEOUTS.upload,
    },
    (value) => parseWith(ingestionJobResultSchema, value, "POST /api/files/{id}/ingest"),
  );
}

export function queueIngestion(
  input: IngestionJobCreate,
  signal?: AbortSignal,
): Promise<IngestionJobResult> {
  const parsed = ingestionJobCreateSchema.parse(input);
  return apiJson(
    "/api/ingestion-jobs",
    { method: "POST", body: parsed, signal, timeoutMs: TIMEOUTS.mutation },
    (value) => parseWith(ingestionJobResultSchema, value, "POST /api/ingestion-jobs"),
  );
}

export function listJobs(
  options: { fileId?: string; status?: string } = {},
  signal?: AbortSignal,
): Promise<IngestionJob[]> {
  return apiJson(
    "/api/ingestion-jobs",
    { signal, query: { fileId: options.fileId, status: options.status } },
    (value) => parseWith(jobListSchema, value, "GET /api/ingestion-jobs"),
  );
}

export function getJob(jobId: string, signal?: AbortSignal): Promise<IngestionJob> {
  return apiJson(`/api/ingestion-jobs/${enc(jobId)}`, { signal }, (value) =>
    parseWith(ingestionJobSchema, value, "GET /api/ingestion-jobs/{id}"),
  );
}

export function getSupportedTypes(signal?: AbortSignal): Promise<string[]> {
  return apiJson("/api/files/supported-types", { signal }, (value) =>
    parseWith(supportedTypesSchema, value, "GET /api/files/supported-types"),
  );
}

// ─── Documents ────────────────────────────────────────────────────────────────

export function listDocuments(
  options: DocumentListFilters = {},
  signal?: AbortSignal,
): Promise<KnowledgeDocument[]> {
  return apiJson(
    "/api/documents",
    { signal, query: { projectId: options.projectId, status: options.status } },
    (value) => parseWith(documentListSchema, value, "GET /api/documents"),
  );
}

export function getDocument(documentId: string, signal?: AbortSignal): Promise<KnowledgeDocument> {
  return apiJson(`/api/documents/${enc(documentId)}`, { signal }, (value) =>
    parseWith(knowledgeDocumentSchema, value, "GET /api/documents/{id}"),
  );
}

export function createDocument(
  input: DocumentCreate,
  signal?: AbortSignal,
): Promise<KnowledgeDocument> {
  const parsed = documentCreateSchema.parse(input);
  return apiJson(
    "/api/documents",
    { method: "POST", body: parsed, signal, timeoutMs: TIMEOUTS.mutation },
    (value) => parseWith(knowledgeDocumentSchema, value, "POST /api/documents"),
  );
}

export function updateDocument(
  documentId: string,
  input: DocumentUpdate,
  signal?: AbortSignal,
): Promise<KnowledgeDocument> {
  return apiJson(
    `/api/documents/${enc(documentId)}`,
    {
      method: "PATCH",
      body: definedOnly(input as Record<string, unknown>),
      signal,
      timeoutMs: TIMEOUTS.mutation,
    },
    (value) => parseWith(knowledgeDocumentSchema, value, "PATCH /api/documents/{id}"),
  );
}

export function deleteDocument(documentId: string, signal?: AbortSignal): Promise<void> {
  return apiVoid(`/api/documents/${enc(documentId)}`, { method: "DELETE", signal });
}

export function listChunks(documentId: string, signal?: AbortSignal): Promise<DocumentChunk[]> {
  return apiJson(`/api/documents/${enc(documentId)}/chunks`, { signal }, (value) =>
    parseWith(documentChunkListSchema, value, "GET /api/documents/{id}/chunks"),
  );
}

export function getChunkCount(
  documentId: string,
  signal?: AbortSignal,
): Promise<{ chunk_count: number }> {
  return apiJson(`/api/documents/${enc(documentId)}/chunk-count`, { signal }, (value) => {
    const result = value as Record<string, unknown>;
    return { chunk_count: Number(result.chunk_count ?? 0) };
  });
}

export function reindexDocument(
  documentId: string,
  input: DocumentReindex = {},
  signal?: AbortSignal,
): Promise<IndexResult> {
  const parsed = documentReindexSchema.parse(input);
  return apiJson(
    `/api/documents/${enc(documentId)}/embeddings`,
    {
      method: "POST",
      body: definedOnly(parsed as Record<string, unknown>),
      signal,
      timeoutMs: TIMEOUTS.upload,
    },
    (value) => parseWith(indexResultSchema, value, "POST /api/documents/{id}/embeddings"),
  );
}

// ─── Knowledge Bases ──────────────────────────────────────────────────────────

export function listKnowledgeBases(signal?: AbortSignal): Promise<KnowledgeBase[]> {
  return apiJson("/api/knowledge-bases", { signal }, (value) =>
    parseWith(kbListSchema, value, "GET /api/knowledge-bases"),
  );
}

export function getKnowledgeBase(kbId: string, signal?: AbortSignal): Promise<KnowledgeBase> {
  return apiJson(`/api/knowledge-bases/${enc(kbId)}`, { signal }, (value) =>
    parseWith(knowledgeBaseSchema, value, "GET /api/knowledge-bases/{id}"),
  );
}

export function createKnowledgeBase(
  input: KnowledgeBaseCreate,
  signal?: AbortSignal,
): Promise<KnowledgeBase> {
  const parsed = knowledgeBaseCreateSchema.parse(input);
  return apiJson(
    "/api/knowledge-bases",
    { method: "POST", body: parsed, signal, timeoutMs: TIMEOUTS.mutation },
    (value) => parseWith(knowledgeBaseSchema, value, "POST /api/knowledge-bases"),
  );
}

export function updateKnowledgeBase(
  kbId: string,
  input: KnowledgeBaseUpdate,
  signal?: AbortSignal,
): Promise<KnowledgeBase> {
  return apiJson(
    `/api/knowledge-bases/${enc(kbId)}`,
    {
      method: "PATCH",
      body: definedOnly(input as Record<string, unknown>),
      signal,
      timeoutMs: TIMEOUTS.mutation,
    },
    (value) => parseWith(knowledgeBaseSchema, value, "PATCH /api/knowledge-bases/{id}"),
  );
}

export function deleteKnowledgeBase(kbId: string, signal?: AbortSignal): Promise<void> {
  return apiVoid(`/api/knowledge-bases/${enc(kbId)}`, { method: "DELETE", signal });
}

export function listKbDocuments(kbId: string, signal?: AbortSignal): Promise<KbDocumentEntry[]> {
  return apiJson(`/api/knowledge-bases/${enc(kbId)}/documents`, { signal }, (value) =>
    parseWith(kbDocumentListSchema, value, "GET /api/knowledge-bases/{id}/documents"),
  );
}

export function replaceKbDocuments(
  kbId: string,
  documentIds: string[],
  signal?: AbortSignal,
): Promise<KbDocumentEntry[]> {
  return apiJson(
    `/api/knowledge-bases/${enc(kbId)}/documents`,
    {
      method: "PUT",
      body: { document_ids: documentIds },
      signal,
      timeoutMs: TIMEOUTS.mutation,
    },
    (value) =>
      parseWith(kbDocumentListSchema, value, "PUT /api/knowledge-bases/{id}/documents"),
  );
}

export function updateKbDocument(
  kbId: string,
  documentId: string,
  patch: { is_enabled: boolean },
  signal?: AbortSignal,
): Promise<KbDocumentEntry> {
  return apiJson(
    `/api/knowledge-bases/${enc(kbId)}/documents/${enc(documentId)}`,
    { method: "PATCH", body: patch, signal, timeoutMs: TIMEOUTS.mutation },
    (value) =>
      parseWith(
        kbDocumentEntrySchema,
        value,
        "PATCH /api/knowledge-bases/{id}/documents/{id}",
      ),
  );
}

export function detachKbDocument(
  kbId: string,
  documentId: string,
  signal?: AbortSignal,
): Promise<void> {
  return apiVoid(`/api/knowledge-bases/${enc(kbId)}/documents/${enc(documentId)}`, {
    method: "DELETE",
    signal,
  });
}

// ─── Search / Retrievals ──────────────────────────────────────────────────────

export function searchKnowledgeBase(
  kbId: string,
  input: SearchRequest,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const parsed = searchRequestSchema.parse(input);
  return apiJson(
    `/api/knowledge-bases/${enc(kbId)}/search`,
    { method: "POST", body: parsed, signal, timeoutMs: 30_000 },
    (value) => parseWith(searchResponseSchema, value, "POST /api/knowledge-bases/{id}/search"),
  );
}

export function listRetrievals(signal?: AbortSignal): Promise<Retrieval[]> {
  return apiJson("/api/retrievals", { signal }, (value) =>
    parseWith(retrievalListSchema, value, "GET /api/retrievals"),
  );
}

export function getRetrieval(retrievalId: string, signal?: AbortSignal): Promise<Retrieval> {
  return apiJson(`/api/retrievals/${enc(retrievalId)}`, { signal }, (value) =>
    parseWith(retrievalSchema, value, "GET /api/retrievals/{id}"),
  );
}

export function getRetrievalResults(
  retrievalId: string,
  signal?: AbortSignal,
): Promise<RetrievalResult[]> {
  return apiJson(`/api/retrievals/${enc(retrievalId)}/results`, { signal }, (value) =>
    parseWith(retrievalResultListSchema, value, "GET /api/retrievals/{id}/results"),
  );
}

// ─── Citations ────────────────────────────────────────────────────────────────

export function listCitations(
  options: { responseId?: string; retrievalId?: string } = {},
  signal?: AbortSignal,
): Promise<Citation[]> {
  return apiJson(
    "/api/citations",
    { signal, query: { responseId: options.responseId, retrievalId: options.retrievalId } },
    (value) => parseWith(citationListSchema, value, "GET /api/citations"),
  );
}

export function getCitation(citationId: string, signal?: AbortSignal): Promise<Citation> {
  return apiJson(`/api/citations/${enc(citationId)}`, { signal }, (value) =>
    parseWith(citationSchema, value, "GET /api/citations/{id}"),
  );
}

export function createCitation(
  input: CitationCreate,
  signal?: AbortSignal,
): Promise<Citation> {
  const parsed = citationCreateSchema.parse(input);
  return apiJson(
    "/api/citations",
    { method: "POST", body: parsed, signal, timeoutMs: TIMEOUTS.mutation },
    (value) => parseWith(citationSchema, value, "POST /api/citations"),
  );
}

export function deleteCitation(citationId: string, signal?: AbortSignal): Promise<void> {
  return apiVoid(`/api/citations/${enc(citationId)}`, { method: "DELETE", signal });
}

// ─── Re-exports ───────────────────────────────────────────────────────────────

export {
  citationCreateSchema,
  citationSchema,
  documentChunkSchema,
  documentCreateSchema,
  documentReindexSchema,
  documentUpdateSchema,
  fileIngestSchema,
  fileUpdateSchema,
  indexResultSchema,
  ingestionJobCreateSchema,
  ingestionJobResultSchema,
  ingestionJobSchema,
  kbDocumentEntrySchema,
  knowledgeBaseCreateSchema,
  knowledgeBaseSchema,
  knowledgeBaseUpdateSchema,
  knowledgeDocumentSchema,
  knowledgeFileSchema,
  retrievalResultSchema,
  retrievalSchema,
  searchRequestSchema,
  searchResponseSchema,
};
export type {
  Citation,
  CitationCreate,
  DocumentChunk,
  DocumentCreate,
  DocumentReindex,
  DocumentUpdate,

  FileIngest,
  FileUpdate,
  IndexResult,
  IngestionJob,
  IngestionJobCreate,
  IngestionJobResult,
  KbDocumentEntry,
  KnowledgeBase,
  KnowledgeBaseCreate,
  KnowledgeBaseUpdate,
  KnowledgeDocument,
  KnowledgeFile,
  Retrieval,
  RetrievalResult,
  SearchRequest,
  SearchResponse,
};
