/**
 * Knowledge module public surface (.agent/project_structure_graph.txt).
 * Other modules import ONLY from here — never deep paths.
 */

// ─── API functions ────────────────────────────────────────────────────────────
export {
  // Files
  deleteFile,
  downloadFile,
  getFile,
  getJob,
  getSupportedTypes,
  ingestFile,
  knowledgeKeys,
  listFiles,
  listJobs,
  queueIngestion,
  updateFile,
  uploadFile,
  // Documents
  createDocument,
  deleteDocument,
  documentKeys,
  getChunkCount,
  getDocument,
  listChunks,
  listDocuments,
  reindexDocument,
  updateDocument,
  // Knowledge Bases
  createKnowledgeBase,
  deleteKnowledgeBase,
  detachKbDocument,
  getKnowledgeBase,
  kbKeys,
  listKbDocuments,
  listKnowledgeBases,
  replaceKbDocuments,
  updateKbDocument,
  updateKnowledgeBase,
  // Search / Retrievals
  getRetrieval,
  getRetrievalResults,
  listRetrievals,
  searchKnowledgeBase,
  // Citations
  createCitation,
  deleteCitation,
  getCitation,
  listCitations,
  // Type re-exports
  type Citation,
  type CitationCreate,
  type DocumentChunk,
  type DocumentCreate,
  type DocumentListFilters,
  type DocumentReindex,
  type DocumentUpdate,
  type FileIngest,
  type FileListFilters,
  type FileUpdate,
  type IndexResult,
  type IngestionJob,
  type IngestionJobCreate,
  type IngestionJobResult,
  type JobListFilters,
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
} from "./api";

// ─── Schemas ──────────────────────────────────────────────────────────────────
export {
  citationCreateSchema,
  citationSchema,
  documentChunkSchema,
  documentCreateSchema,
  documentReindexSchema,
  documentStatusSchema,
  documentUpdateSchema,
  embeddingProviderSchema,
  fileIngestSchema,
  fileUpdateSchema,
  hasSupportedExtension,
  indexResultSchema,
  ingestionJobCreateSchema,
  ingestionJobResultSchema,
  ingestionJobSchema,
  ingestionJobStatusSchema,
  isJobFinal,
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
  deriveDocumentTitle,
  type DocumentSource,
  type DocumentStatus,
  type EmbeddingProvider,
  type IngestionJobStatus,
} from "./schemas";

// ─── Hooks ────────────────────────────────────────────────────────────────────
export {
  // Files
  invalidateKnowledge,
  useDeleteFile,
  useFileJobs,
  useFiles,
  useIngestFile,
  useIngestionJob,
  useQueueIngestion,
  useRenameFile,
  useSupportedTypes,
  useUploadFile,
  // Documents
  useCreateDocument,
  useDeleteDocument,
  useDocumentChunkCount,
  useDocumentChunks,
  useDocuments,
  useReindexDocument,
  useUpdateDocument,
  // Knowledge Bases
  useCreateKnowledgeBase,
  useDeleteKnowledgeBase,
  useDetachKbDocument,
  useKbDocuments,
  useKnowledgeBases,
  useReplaceKbDocuments,
  useUpdateKbDocument,
  useUpdateKnowledgeBase,
  // Search / Retrievals
  useRetrievalResults,
  useRetrievals,
  useSearchKnowledgeBase,
  // Citations
  useCreateCitation,
  useDeleteCitation,
  useCitations,
} from "./hooks";

// ─── Components ───────────────────────────────────────────────────────────────
export { FilesPanel } from "./components/FilesPanel";
export { FileRow } from "./components/FileRow";
export { FileUploadZone } from "./components/FileUploadZone";
export { IngestMenuItems } from "./components/IngestMenuItems";
export { DocumentsPanel } from "./components/DocumentsPanel";
export { KnowledgeBasesPanel } from "./components/KnowledgeBasesPanel";
export { SearchPanel } from "./components/SearchPanel";
export { CitationBadges } from "./components/CitationBadges";

