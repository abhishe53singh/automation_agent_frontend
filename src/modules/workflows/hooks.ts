"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  workflowKeys,
  listWorkflows,
  getWorkflow,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  listWorkflowRuns,
  triggerWorkflowRun,
} from "./api";
import type { WorkflowCreate } from "./schemas";
import { isApiError } from "@/shared/lib/api";

function messageFor(error: unknown, fallback: string): string {
  return isApiError(error) ? error.message : fallback;
}

export function useWorkflows(projectId?: string) {
  return useQuery({
    queryKey: workflowKeys.list(projectId),
    queryFn: ({ signal }) => listWorkflows(projectId, signal),
    staleTime: 30_000,
  });
}

export function useWorkflow(id: string | null | undefined) {
  return useQuery({
    queryKey: workflowKeys.detail(id ?? ""),
    queryFn: ({ signal }) => getWorkflow(id as string, signal),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useWorkflowRuns(workflowId: string | null | undefined) {
  return useQuery({
    queryKey: workflowKeys.runs(workflowId ?? ""),
    queryFn: ({ signal }) => listWorkflowRuns(workflowId as string, signal),
    enabled: Boolean(workflowId),
    staleTime: 15_000,
  });
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: WorkflowCreate) => createWorkflow(input),
    onSuccess: (wf) => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.all });
      toast.success(`Workflow "${wf.name}" created.`);
    },
    onError: (err) => toast.error(messageFor(err, "Failed to create workflow.")),
  });
}

export function useUpdateWorkflow(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<WorkflowCreate>) => updateWorkflow(id, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.all });
      toast.success("Workflow updated.");
    },
    onError: (err) => toast.error(messageFor(err, "Failed to update workflow.")),
  });
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWorkflow(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.all });
      toast.success("Workflow deleted.");
    },
    onError: (err) => toast.error(messageFor(err, "Failed to delete workflow.")),
  });
}

export function useTriggerWorkflowRun(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => triggerWorkflowRun(workflowId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.runs(workflowId) });
      toast.success("Workflow triggered.");
    },
    onError: (err) => toast.error(messageFor(err, "Failed to trigger workflow.")),
  });
}

