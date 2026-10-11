import { z } from "zod";

import { TIMEOUTS, apiFetch, apiJson, apiVoid, definedOnly, parseWith } from "@/shared/lib/api";

import {
  fileIngestSchema,
  fileUpdateSchema,
  ingestionJobCreateSchema,
  ingestionJobResultSchema,
  ingestionJobSchema,
  knowledgeFileSchema,
  type FileIngest,
  type FileUpdate,
  type IngestionJob,
  type IngestionJobCreate,
  type IngestionJobResult,
  type KnowledgeFile,
} from "./schemas";

export interface FileListFilters {
  projectId?: string;
}

export interface JobListFilters {
  fileId?: string;
  status?: string;
}

export const knowledgeKeys = {
  all: ["knowledge"] as const,
  files: (filters?: FileListFilters) => ["knowledge", "files", filters ?? {}] as const,
  file: (fileId: string) => ["knowledge", "file", fileId] as const,
  jobs: (filters?: JobListFilters) => ["knowledge", "jobs", filters ?? {}] as const,
  job: (jobId: string) => ["knowledge", "job", jobId] as const,
  supportedTypes: () => ["knowledge", "supported-types"] as const,
};

const fileListSchema = z.array(knowledgeFileSchema);
const jobListSchema = z.array(ingestionJobSchema);
const supportedTypesSchema = z.array(z.string());

const id = (value: string) => encodeURIComponent(value);

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
  return apiJson(`/api/files/${id(fileId)}`, { signal }, (value) =>
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
    `/api/files/${id(fileId)}`,
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
  return apiVoid(`/api/files/${id(fileId)}`, { method: "DELETE", signal });
}


export function downloadFile(fileId: string, signal?: AbortSignal): Promise<Response> {
  return apiFetch(`/api/files/${id(fileId)}/download`, { signal, raw: true });
}

export function ingestFile(
  fileId: string,
  input: FileIngest = {},
  signal?: AbortSignal,
): Promise<IngestionJobResult> {
  const parsed = fileIngestSchema.parse(input);
  return apiJson(
    `/api/files/${id(fileId)}/ingest`,
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
  return apiJson(`/api/ingestion-jobs/${id(jobId)}`, { signal }, (value) =>
    parseWith(ingestionJobSchema, value, "GET /api/ingestion-jobs/{id}"),
  );
}

export {
  fileIngestSchema,
  fileUpdateSchema,
  ingestionJobCreateSchema,
  ingestionJobResultSchema,
  ingestionJobSchema,
  knowledgeFileSchema,
};
export type {
  FileIngest,
  FileUpdate,
  IngestionJob,
  IngestionJobCreate,
  IngestionJobResult,
  KnowledgeFile,
};
export function getSupportedTypes(signal?: AbortSignal): Promise<string[]> {
  return apiJson("/api/files/supported-types", { signal }, (value) =>
    parseWith(supportedTypesSchema, value, "GET /api/files/supported-types"),
  );
}
