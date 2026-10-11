/**
 * Knowledge module public surface (.agent/project_structure_graph.txt).
 * Other modules import ONLY from here — never deep paths.
 */
export {
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
  type FileIngest,
  type FileListFilters,
  type FileUpdate,
  type IngestionJob,
  type IngestionJobCreate,
  type IngestionJobResult,
  type JobListFilters,
  type KnowledgeFile,
} from "./api";
export {
  embeddingProviderSchema,
  fileIngestSchema,
  fileUpdateSchema,
  hasSupportedExtension,
  ingestionJobCreateSchema,
  ingestionJobResultSchema,
  ingestionJobSchema,
  ingestionJobStatusSchema,
  isJobFinal,
  knowledgeFileSchema,
  type EmbeddingProvider,
  type IngestionJobStatus,
} from "./schemas";
export {
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
} from "./hooks";
export { FilesPanel } from "./components/FilesPanel";
export { FileRow } from "./components/FileRow";
export { FileUploadZone } from "./components/FileUploadZone";
export { IngestMenuItems } from "./components/IngestMenuItems";
