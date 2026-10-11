"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { isApiError } from "@/shared/lib/api";

import {
  deleteFile,
  getJob,
  getSupportedTypes,
  ingestFile,
  knowledgeKeys,
  listFiles,
  listJobs,
  queueIngestion,
  updateFile,
  uploadFile,
} from "./api";
import { isJobFinal } from "./schemas";
import type { FileUpdate } from "./schemas";

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
      toast.success(`Uploaded “${created.filename}”.`);
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