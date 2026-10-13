import { z } from "zod";

/**
 * Knowledge module schemas — files slice (.agent/phase_5.txt items 39-41;
 * upstream entries 43-49, shapes from `.backend_agent/API.md`).
 *
 * Field names stay snake_case exactly as the API sends them. Nullability is
 * explicit (`.nullable()`), optional request fields are `.optional()`.
 */

/** Upstream `FileResponse`. */
export const knowledgeFileSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  project_id: z.string().uuid().nullable(),
  filename: z.string(),
  content_type: z.string().nullable(),
  size_bytes: z.number().int(),
  storage_path: z.string(),
  sha256: z.string().nullable(),
  status: z.string(),
  metadata_json: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type KnowledgeFile = z.infer<typeof knowledgeFileSchema>;

/** PATCH /api/files/{id} — rename and/or re-scope to another project. */
export const fileUpdateSchema = z
  .object({
    filename: z.string().trim().min(1, "Name is required").max(255, "Max 255 characters").optional(),
    project_id: z.string().uuid().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Nothing to update." });
export type FileUpdate = z.infer<typeof fileUpdateSchema>;

/** POST /api/files/{id}/ingest — chunk + embed an uploaded file. */
export const embeddingProviderSchema = z.enum([
  "local",
  "openai",
  "cohere",
  "voyage",
  "azure-openai",
  "gemini",
]);
export type EmbeddingProvider = z.infer<typeof embeddingProviderSchema>;

export const fileIngestSchema = z.object({
  knowledge_base_id: z.string().uuid().optional(),
  chunk_size: z.coerce.number().int().min(50).max(20000).optional(),
  chunk_overlap: z.coerce.number().int().min(0).max(10000).optional(),
  run_inline: z.boolean().optional(),
  embedding_provider: embeddingProviderSchema.optional(),
  embedding_model: z.string().trim().max(150).optional(),
  embedding_dimension: z.coerce.number().int().min(8).max(8192).optional(),
});
export type FileIngest = z.infer<typeof fileIngestSchema>;

/** Upstream `IngestionJobResponse`. */
export const ingestionJobStatusSchema = z.enum([
  "pending",
  "running",
  "succeeded",
  "failed",
  "cancelled",
]);
export type IngestionJobStatus = z.infer<typeof ingestionJobStatusSchema>;

export const isJobFinal = (status: IngestionJobStatus): boolean =>
  status === "succeeded" || status === "failed" || status === "cancelled";

export const ingestionJobSchema = z.object({
  id: z.string().uuid(),
  file_id: z.string().uuid(),
  user_id: z.string().uuid(),
  project_id: z.string().uuid().nullable(),
  status: ingestionJobStatusSchema,
  stage: z.string(),
  attempts: z.number().int(),
  max_attempts: z.number().int(),
  chunk_size: z.number().int().nullable(),
  chunk_overlap: z.number().int().nullable(),
  error_message: z.string().nullable(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type IngestionJob = z.infer<typeof ingestionJobSchema>;

/** Upstream `IngestionJobResult` (ingest + queue-ingest responses). */
export const ingestionJobResultSchema = z.object({
  job: ingestionJobSchema,
  document_id: z.string().uuid().nullable(),
  chunk_count: z.number().int(),
  embedding_count: z.number().int(),
});
export type IngestionJobResult = z.infer<typeof ingestionJobResultSchema>;

/** POST /api/ingestion-jobs — queue ingestion by file id. */
export const ingestionJobCreateSchema = z.object({
  file_id: z.string().uuid("A file is required"),
  knowledge_base_id: z.string().uuid().optional(),
  chunk_size: z.coerce.number().int().min(50).max(20000).optional(),
  chunk_overlap: z.coerce.number().int().min(0).max(10000).optional(),
  run_inline: z.boolean().optional(),
});
export type IngestionJobCreate = z.infer<typeof ingestionJobCreateSchema>;

/** Upstream `DocumentResponse`. */
export const documentStatusSchema = z.enum([
  "pending",
  "parsed",
  "chunked",
  "embedded",
  "failed",
]);
export type DocumentStatus = z.infer<typeof documentStatusSchema>;

export const documentSourceSchema = z.enum(["text", "file"]);
export type DocumentSource = z.infer<typeof documentSourceSchema>;

export const knowledgeDocumentSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  project_id: z.string().uuid().nullable(),
  file_id: z.string().uuid().nullable(),
  ingestion_job_id: z.string().uuid().nullable(),
  title: z.string(),
  source_type: documentSourceSchema,
  mime_type: z.string().nullable(),
  language: z.string().nullable(),
  page_count: z.number().int().nullable(),
  word_count: z.number().int(),
  char_count: z.number().int(),
  chunk_count: z.number().int(),
  checksum: z.string().nullable(),
  status: documentStatusSchema,
  metadata_json: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type KnowledgeDocument = z.infer<typeof knowledgeDocumentSchema>;

/** POST /api/documents — create from inline text (no upload path). */
export const documentCreateSchema = z.object({
  title: z.string().trim().min(1, "A title is required").max(300, "Max 300 characters"),
  text: z.string().trim().min(1, "Type or paste some text first"),
  project_id: z.string().uuid().optional(),
  language: z.string().trim().max(20).optional(),
});
export type DocumentCreate = z.infer<typeof documentCreateSchema>;

/** PATCH /api/documents/{id} — rename and/or re-scope. */
export const documentUpdateSchema = z
  .object({
    title: z.string().trim().min(1, "Name is required").max(300, "Max 300 characters").optional(),
    project_id: z.string().uuid().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Nothing to update." });
export type DocumentUpdate = z.infer<typeof documentUpdateSchema>;

/** Upstream `DocumentChunkResponse`. */
export const documentChunkSchema = z.object({
  id: z.string().uuid(),
  document_id: z.string().uuid(),
  chunk_index: z.number().int(),
  content: z.string(),
  token_count: z.number().int(),
  char_count: z.number().int(),
  page_number: z.number().int().nullable(),
  start_offset: z.number().int().nullable(),
  end_offset: z.number().int().nullable(),
  heading: z.string().nullable(),
  metadata_json: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string(),
});
export type DocumentChunk = z.infer<typeof documentChunkSchema>;

/** Upstream `EmbeddingResponse` — metadata only, vectors never returned. */
export const documentEmbeddingSchema = z.object({
  id: z.string().uuid(),
  chunk_id: z.string().uuid(),
  document_id: z.string().uuid(),
  model_id: z.string().uuid().nullable(),
  provider: z.string(),
  model_name: z.string(),
  dimension: z.number().int(),
  normalized: z.boolean(),
  metadata_json: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string(),
});
export type DocumentEmbedding = z.infer<typeof documentEmbeddingSchema>;

/** POST /api/documents/{id}/embeddings — re-chunk + re-embed in place. */
export const documentReindexSchema = z.object({
  chunk_size: z.coerce.number().int().min(50).max(20000).optional(),
  chunk_overlap: z.coerce.number().int().min(0).max(10000).optional(),
  embedding_provider: embeddingProviderSchema.optional(),
  embedding_model: z.string().trim().max(150).optional(),
  embedding_dimension: z.coerce.number().int().min(8).max(8192).optional(),
});
export type DocumentReindex = z.infer<typeof documentReindexSchema>;

/** Upstream `IndexResult` (reindex response). */
export const indexResultSchema = z.object({
  document_id: z.string().uuid(),
  chunk_count: z.number().int(),
  embedding_count: z.number().int(),
});
export type IndexResult = z.infer<typeof indexResultSchema>;

/** Derive a title from pasted text (law #2 — never ask what we can derive). */
export function deriveDocumentTitle(text: string): string {
  const firstLine = (text ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .split("\n")
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .find((line) => line.length > 0);
  if (!firstLine) return "Untitled document";
  const collapsed = firstLine.replace(/\s+/g, " ").trim();
  if (collapsed.length <= 60) return collapsed;
  return `${collapsed.slice(0, collapsed.lastIndexOf(" ", 57) > 20 ? collapsed.lastIndexOf(" ", 57) : 57)}…`;
}

/** Client-side upload guard: extension allow-list from GET supported-types. */
export function hasSupportedExtension(filename: string, supported: readonly string[]): boolean {
  const dot = filename.lastIndexOf(".");
  if (dot === -1) return false;
  const ext = filename.slice(dot).toLowerCase();
  return supported.some((s) => s.toLowerCase() === ext);
}

// ─── Knowledge bases ────────────────────────────────────────────────────────

/** Upstream `KnowledgeBaseResponse`. */
export const knowledgeBaseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  project_id: z.string().uuid().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  embedding_provider: z.string(),
  embedding_model: z.string(),
  embedding_dimension: z.number().int(),
  chunk_size: z.number().int().nullable(),
  chunk_overlap: z.number().int().nullable(),
  default_top_k: z.number().int(),
  min_score: z.number().nullable(),
  is_active: z.boolean(),
  document_count: z.number().int().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type KnowledgeBase = z.infer<typeof knowledgeBaseSchema>;

/** POST /api/knowledge-bases — embedding provider/model/dim are fixed at creation. */
export const knowledgeBaseCreateSchema = z.object({
  name: z.string().trim().min(1, "A name is required").max(200, "Max 200 characters"),
  description: z.string().trim().max(1000).optional(),
  project_id: z.string().uuid().optional(),
  embedding_provider: z.string().min(1, "Choose an embedding provider"),
  embedding_model: z.string().min(1, "Enter a model name"),
  embedding_dimension: z.coerce.number().int().min(8).max(8192),
  chunk_size: z.coerce.number().int().min(50).max(20000).optional(),
  chunk_overlap: z.coerce.number().int().min(0).max(10000).optional(),
  default_top_k: z.coerce.number().int().min(1).max(50).optional(),
  min_score: z.coerce.number().min(0).max(1).optional(),
});
export type KnowledgeBaseCreate = z.infer<typeof knowledgeBaseCreateSchema>;

/** PATCH /api/knowledge-bases/{id} — mutable settings only. */
export const knowledgeBaseUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    default_top_k: z.coerce.number().int().min(1).max(50).optional(),
    min_score: z.coerce.number().min(0).max(1).nullable().optional(),
    is_active: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update." });
export type KnowledgeBaseUpdate = z.infer<typeof knowledgeBaseUpdateSchema>;

/** Attachment entry within a KB document list. */
export const kbDocumentEntrySchema = z.object({
  id: z.string().uuid(),
  knowledge_base_id: z.string().uuid(),
  document_id: z.string().uuid(),
  is_enabled: z.boolean(),
  chunk_count: z.number().int().optional(),
  created_at: z.string(),
  // Expanded document fields may be present
  document: z
    .object({
      id: z.string().uuid(),
      title: z.string(),
      status: documentStatusSchema,
      chunk_count: z.number().int(),
      word_count: z.number().int(),
    })
    .optional(),
});
export type KbDocumentEntry = z.infer<typeof kbDocumentEntrySchema>;

// ─── Retrievals ──────────────────────────────────────────────────────────────

/** Upstream `RetrievalResponse`. */
export const retrievalSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  knowledge_base_id: z.string().uuid(),
  query: z.string(),
  top_k: z.number().int(),
  min_score: z.number().nullable(),
  result_count: z.number().int(),
  created_at: z.string(),
});
export type Retrieval = z.infer<typeof retrievalSchema>;

/** Upstream `RetrievalResultResponse`. */
export const retrievalResultSchema = z.object({
  id: z.string().uuid(),
  retrieval_id: z.string().uuid(),
  chunk_id: z.string().uuid(),
  document_id: z.string().uuid(),
  score: z.number(),
  rank: z.number().int(),
  content: z.string(),
  document_title: z.string().nullable(),
  chunk_index: z.number().int().nullable(),
  page_number: z.number().int().nullable(),
  heading: z.string().nullable(),
});
export type RetrievalResult = z.infer<typeof retrievalResultSchema>;

/** POST /api/knowledge-bases/{id}/search */
export const searchRequestSchema = z.object({
  query: z.string().trim().min(1, "Enter a search query"),
  top_k: z.coerce.number().int().min(1).max(50).optional(),
  min_score: z.coerce.number().min(0).max(1).optional(),
});
export type SearchRequest = z.infer<typeof searchRequestSchema>;

/** Upstream `SearchResponse` (search result envelope). */
export const searchResponseSchema = z.object({
  retrieval_id: z.string().uuid(),
  results: z.array(retrievalResultSchema),
});
export type SearchResponse = z.infer<typeof searchResponseSchema>;

// ─── Citations ───────────────────────────────────────────────────────────────

/** Upstream `CitationResponse`. */
export const citationSchema = z.object({
  id: z.string().uuid(),
  response_id: z.string().uuid(),
  retrieval_result_id: z.string().uuid().nullable(),
  chunk_id: z.string().uuid().nullable(),
  document_id: z.string().uuid().nullable(),
  quote: z.string().nullable(),
  start_offset: z.number().int().nullable(),
  end_offset: z.number().int().nullable(),
  document_title: z.string().nullable(),
  created_at: z.string(),
});
export type Citation = z.infer<typeof citationSchema>;

/** POST /api/citations */
export const citationCreateSchema = z.object({
  response_id: z.string().uuid("A response ID is required"),
  retrieval_result_id: z.string().uuid().optional(),
  chunk_id: z.string().uuid().optional(),
  quote: z.string().trim().max(2000).optional(),
});
export type CitationCreate = z.infer<typeof citationCreateSchema>;
