"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { isApiError } from "@/shared/lib/api";

import {
  createCitation,
  createDocument,
  createKnowledgeBase,
  deleteCitation,
  deleteDocument,
  deleteFile,
  deleteKnowledgeBase,
  detachKbDocument,
  documentKeys,
  getChunkCount,
  getJob,
  getRetrievalResults,
  getSupportedTypes,
  ingestFile,
  kbKeys,
  knowledgeKeys,
  listChunks,
  listCitations,
  listDocuments,
  listFiles,
  listJobs,
  listKbDocuments,
  listKnowledgeBases,
  listRetrievals,
  queueIngestion,
  reindexDocument,
  replaceKbDocuments,
  searchKnowledgeBase,
  updateDocument,
  updateFile,
  updateKbDocument,
  updateKnowledgeBase,
  uploadFile,
  type DocumentListFilters,
} from "./api";
import { isJobFinal } from "./schemas";
import type {
  CitationCreate,
  DocumentCreate,
  DocumentReindex,
  DocumentUpdate,
  FileUpdate,
  KnowledgeBaseCreate,
  KnowledgeBaseUpdate,
  SearchRequest,
} from "./schemas";


// ─── Utilities ────────────────────────────────────────────────────────────────

export function invalidateKnowledge(
  queryClient: QueryClient,
  scope: "files" | "file" | "jobs",
  fileId?: string,
): void {
  if (scope === "files") {
    void queryClient.invalidateQueries({ queryKey: ["knowledge", "files"] });
    return;
  }
  if (scope === "jobs") {
    void queryClient.invalidateQueries({ queryKey: ["knowledge", "jobs"] });
    return;
  }
  if (!fileId) return;
  void queryClient.invalidateQueries({ queryKey: knowledgeKeys.file(fileId) });
}

function messageFor(error: unknown, fallback: string): string {
  return isApiError(error) ? error.message : fallback;
}

// ─── Files ────────────────────────────────────────────────────────────────────

export function useFiles(options: { projectId?: string } = {}) {
  return useQuery({
    queryKey: knowledgeKeys.files({ projectId: options.projectId }),
    queryFn: ({ signal }) => listFiles({ projectId: options.projectId }, signal),
    staleTime: 30_000,
  });
}

export function useSupportedTypes() {
  return useQuery({
    queryKey: knowledgeKeys.supportedTypes(),
    queryFn: ({ signal }) => getSupportedTypes(signal),
    staleTime: 5 * 60_000,
  });
}

export function useIngestionJob(jobId: string | null | undefined) {
  return useQuery({
    queryKey: knowledgeKeys.job(jobId ?? ""),
    queryFn: ({ signal }) => getJob(jobId as string, signal),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const job = query.state.data;
      if (!job || isJobFinal(job.status)) return false;
      const ageMs = Date.now() - new Date(job.created_at).getTime();
      return ageMs > 30_000 ? 5_000 : 2_000;
    },
  });
}

export function useFileJobs(fileId: string | null | undefined) {
  return useQuery({
    queryKey: knowledgeKeys.jobs({ fileId: fileId ?? undefined }),
    queryFn: ({ signal }) => listJobs({ fileId: fileId as string }, signal),
    enabled: Boolean(fileId),
    refetchInterval: (query) => {
      const jobs = query.state.data;
      if (!jobs || jobs.length === 0) return false;
      const latest = jobs[0];
      if (!latest || isJobFinal(latest.status)) return false;
      return 2_000;
    },
  });
}

export function useUploadFile(options: { projectId?: string } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadFile(file, { projectId: options.projectId }),
    onSuccess: (created) => {
      queryClient.setQueryData(knowledgeKeys.file(created.id), created);
      invalidateKnowledge(queryClient, "files");
      toast.success(`Uploaded "${created.filename}".`);
    },
    onError: (error) => toast.error(messageFor(error, "Could not upload that file.")),
  });
}

export function useRenameFile(fileId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FileUpdate) => updateFile(fileId, input),
    onSuccess: (updated) => {
      queryClient.setQueryData(knowledgeKeys.file(fileId), updated);
      invalidateKnowledge(queryClient, "files");
      toast.success("File renamed.");
    },
    onError: (error) => toast.error(messageFor(error, "Could not rename that file.")),
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) => deleteFile(fileId),
    onSuccess: (_result, fileId) => {
      queryClient.removeQueries({ queryKey: knowledgeKeys.file(fileId) });
      invalidateKnowledge(queryClient, "files");
      toast.success("File deleted.");
    },
    onError: (error) => toast.error(messageFor(error, "Could not delete that file.")),
  });
}

export function useIngestFile(fileId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => ingestFile(fileId, { run_inline: true }),
    onSuccess: (result) => {
      queryClient.setQueryData(knowledgeKeys.job(result.job.id), result.job);
      invalidateKnowledge(queryClient, "files");
      invalidateKnowledge(queryClient, "jobs");
      if (result.job.status === "succeeded") {
        toast.success(`Ready — ${result.chunk_count} chunk${result.chunk_count === 1 ? "" : "s"}.`);
      } else if (result.job.status === "failed") {
        toast.error(result.job.error_message ?? "Ingestion failed.");
      }
    },
    onError: (error) => toast.error(messageFor(error, "Could not start ingestion.")),
  });
}

export function useQueueIngestion(fileId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => queueIngestion({ file_id: fileId, run_inline: false }),
    onSuccess: (result) => {
      queryClient.setQueryData(knowledgeKeys.job(result.job.id), result.job);
      invalidateKnowledge(queryClient, "jobs");
      toast.success("Ingestion queued.");
    },
    onError: (error) => toast.error(messageFor(error, "Could not queue ingestion.")),
  });
}

// ─── Documents ────────────────────────────────────────────────────────────────

export function useDocuments(options: DocumentListFilters = {}) {
  return useQuery({
    queryKey: documentKeys.documents(options),
    queryFn: ({ signal }) => listDocuments(options, signal),
    staleTime: 30_000,
  });
}

export function useDocumentChunks(documentId: string | null | undefined) {
  return useQuery({
    queryKey: documentKeys.chunks(documentId ?? ""),
    queryFn: ({ signal }) => listChunks(documentId as string, signal),
    enabled: Boolean(documentId),
    staleTime: 60_000,
  });
}

export function useDocumentChunkCount(documentId: string | null | undefined) {
  return useQuery({
    queryKey: documentKeys.chunkCount(documentId ?? ""),
    queryFn: ({ signal }) => getChunkCount(documentId as string, signal),
    enabled: Boolean(documentId),
    staleTime: 30_000,
  });
}

export function useCreateDocument(options: { projectId?: string } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DocumentCreate) =>
      createDocument({ ...input, project_id: options.projectId ?? input.project_id }),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ["knowledge", "documents"] });
      toast.success(`Document "${created.title}" created.`);
    },
    onError: (error) => toast.error(messageFor(error, "Could not create document.")),
  });
}

export function useUpdateDocument(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DocumentUpdate) => updateDocument(documentId, input),
    onSuccess: (updated) => {
      queryClient.setQueryData(documentKeys.document(documentId), updated);
      void queryClient.invalidateQueries({ queryKey: ["knowledge", "documents"] });
      toast.success("Document updated.");
    },
    onError: (error) => toast.error(messageFor(error, "Could not update document.")),
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => deleteDocument(documentId),
    onSuccess: (_r, documentId) => {
      queryClient.removeQueries({ queryKey: documentKeys.document(documentId) });
      void queryClient.invalidateQueries({ queryKey: ["knowledge", "documents"] });
      toast.success("Document deleted.");
    },
    onError: (error) => toast.error(messageFor(error, "Could not delete document.")),
  });
}

export function useReindexDocument(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DocumentReindex = {}) => reindexDocument(documentId, input),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: documentKeys.document(documentId) });
      void queryClient.invalidateQueries({ queryKey: documentKeys.chunks(documentId) });
      toast.success(
        `Re-indexed — ${result.chunk_count} chunk${result.chunk_count === 1 ? "" : "s"}.`,
      );
    },
    onError: (error) => toast.error(messageFor(error, "Could not reindex document.")),
  });
}

// ─── Knowledge Bases ──────────────────────────────────────────────────────────

export function useKnowledgeBases() {
  return useQuery({
    queryKey: kbKeys.bases(),
    queryFn: ({ signal }) => listKnowledgeBases(signal),
    staleTime: 30_000,
  });
}

export function useKbDocuments(kbId: string | null | undefined) {
  return useQuery({
    queryKey: kbKeys.kbDocuments(kbId ?? ""),
    queryFn: ({ signal }) => listKbDocuments(kbId as string, signal),
    enabled: Boolean(kbId),
    staleTime: 30_000,
  });
}

export function useCreateKnowledgeBase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: KnowledgeBaseCreate) => createKnowledgeBase(input),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: kbKeys.bases() });
      toast.success(`Knowledge base "${created.name}" created.`);
    },
    onError: (error) => toast.error(messageFor(error, "Could not create knowledge base.")),
  });
}

export function useUpdateKnowledgeBase(kbId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: KnowledgeBaseUpdate) => updateKnowledgeBase(kbId, input),
    onSuccess: (updated) => {
      queryClient.setQueryData(kbKeys.base(kbId), updated);
      void queryClient.invalidateQueries({ queryKey: kbKeys.bases() });
      toast.success("Knowledge base updated.");
    },
    onError: (error) => toast.error(messageFor(error, "Could not update knowledge base.")),
  });
}

export function useDeleteKnowledgeBase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (kbId: string) => deleteKnowledgeBase(kbId),
    onSuccess: (_r, kbId) => {
      queryClient.removeQueries({ queryKey: kbKeys.base(kbId) });
      void queryClient.invalidateQueries({ queryKey: kbKeys.bases() });
      toast.success("Knowledge base deleted.");
    },
    onError: (error) => toast.error(messageFor(error, "Could not delete knowledge base.")),
  });
}

export function useReplaceKbDocuments(kbId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentIds: string[]) => replaceKbDocuments(kbId, documentIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: kbKeys.kbDocuments(kbId) });
      toast.success("Document set updated.");
    },
    onError: (error) => toast.error(messageFor(error, "Could not update document set.")),
  });
}

export function useUpdateKbDocument(kbId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      documentId,
      is_enabled,
    }: {
      documentId: string;
      is_enabled: boolean;
    }) => updateKbDocument(kbId, documentId, { is_enabled }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: kbKeys.kbDocuments(kbId) });
    },
    onError: (error) => toast.error(messageFor(error, "Could not update document.")),
  });
}

export function useDetachKbDocument(kbId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => detachKbDocument(kbId, documentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: kbKeys.kbDocuments(kbId) });
      toast.success("Document detached.");
    },
    onError: (error) => toast.error(messageFor(error, "Could not detach document.")),
  });
}

// ─── Search / Retrievals ──────────────────────────────────────────────────────

export function useRetrievals() {
  return useQuery({
    queryKey: kbKeys.retrievals(),
    queryFn: ({ signal }) => listRetrievals(signal),
    staleTime: 30_000,
  });
}

export function useRetrievalResults(retrievalId: string | null | undefined) {
  return useQuery({
    queryKey: kbKeys.retrievalResults(retrievalId ?? ""),
    queryFn: ({ signal }) => getRetrievalResults(retrievalId as string, signal),
    enabled: Boolean(retrievalId),
    staleTime: 60_000,
  });
}

export function useSearchKnowledgeBase(kbId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SearchRequest) => searchKnowledgeBase(kbId, input),
    onSuccess: (result) => {
      queryClient.setQueryData(kbKeys.retrievalResults(result.retrieval_id), result.results);
      void queryClient.invalidateQueries({ queryKey: kbKeys.retrievals() });
    },
    onError: (error) => toast.error(messageFor(error, "Search failed.")),
  });
}

// ─── Citations ────────────────────────────────────────────────────────────────

export function useCitations(options: { responseId?: string; retrievalId?: string } = {}) {
  return useQuery({
    queryKey: kbKeys.citations(options),
    queryFn: ({ signal }) => listCitations(options, signal),
    enabled: Boolean(options.responseId ?? options.retrievalId),
    staleTime: 60_000,
  });
}

export function useCreateCitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CitationCreate) => createCitation(input),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({
        queryKey: kbKeys.citations({ responseId: created.response_id }),
      });
      toast.success("Citation added.");
    },
    onError: (error) => toast.error(messageFor(error, "Could not add citation.")),
  });
}

export function useDeleteCitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (citationId: string) => deleteCitation(citationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["knowledge", "citations"] });
      toast.success("Citation removed.");
    },
    onError: (error) => toast.error(messageFor(error, "Could not remove citation.")),
  });
}

