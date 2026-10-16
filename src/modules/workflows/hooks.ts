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
  listWorkflowSteps,
  createWorkflowStep,
  updateWorkflowStep,
  deleteWorkflowStep,
  listWorkflowSchedules,
  createWorkflowSchedule,
  deleteWorkflowSchedule,
  listWorkflowRuns,
  getWorkflowRun,
  createWorkflowRun,
  retryWorkflowRun,
  cancelWorkflowRun,
} from "./api";
import type {
  WorkflowCreate,
  WorkflowUpdate,
  WorkflowStepCreate,
  WorkflowStepUpdate,
  WorkflowScheduleCreate,
  WorkflowRunCreate,
} from "./schemas";
import { isApiError } from "@/shared/lib/api";

function messageFor(error: unknown, fallback: string): string {
  return isApiError(error) ? error.message : fallback;
}

export function useWorkflows() {
  return useQuery({
    queryKey: workflowKeys.list(),
    queryFn: ({ signal }) => listWorkflows(signal),
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

export function useCreateWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: WorkflowCreate) => createWorkflow(input),
    onSuccess: (wf) => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.list() });
      toast.success(`Workflow "${wf.name}" created.`);
    },
    onError: (err) => toast.error(messageFor(err, "Failed to create workflow.")),
  });
}

export function useUpdateWorkflow(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: WorkflowUpdate) => updateWorkflow(id, patch),
    onSuccess: (wf) => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.list() });
      void queryClient.invalidateQueries({ queryKey: workflowKeys.detail(id) });
      toast.success(`Workflow "${wf.name}" updated.`);
    },
    onError: (err) => toast.error(messageFor(err, "Failed to update workflow.")),
  });
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWorkflow(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.list() });
      toast.success("Workflow deleted.");
    },
    onError: (err) => toast.error(messageFor(err, "Failed to delete workflow.")),
  });
}

// --- Steps ---
export function useWorkflowSteps(workflowId: string | null | undefined) {
  return useQuery({
    queryKey: workflowKeys.steps(workflowId ?? ""),
    queryFn: ({ signal }) => listWorkflowSteps(workflowId as string, signal),
    enabled: Boolean(workflowId),
    staleTime: 15_000,
  });
}

export function useCreateWorkflowStep(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: WorkflowStepCreate) => createWorkflowStep(workflowId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.steps(workflowId) });
      toast.success("Step added to workflow.");
    },
    onError: (err) => toast.error(messageFor(err, "Failed to add step.")),
  });
}

export function useUpdateWorkflowStep(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stepId, patch }: { stepId: string; patch: WorkflowStepUpdate }) =>
      updateWorkflowStep(workflowId, stepId, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.steps(workflowId) });
      toast.success("Step updated.");
    },
    onError: (err) => toast.error(messageFor(err, "Failed to update step.")),
  });
}

export function useDeleteWorkflowStep(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stepId: string) => deleteWorkflowStep(workflowId, stepId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.steps(workflowId) });
      toast.success("Step removed.");
    },
    onError: (err) => toast.error(messageFor(err, "Failed to remove step.")),
  });
}

// --- Schedules ---
export function useWorkflowSchedules(workflowId: string | null | undefined) {
  return useQuery({
    queryKey: workflowKeys.schedules(workflowId ?? ""),
    queryFn: ({ signal }) => listWorkflowSchedules(workflowId as string, signal),
    enabled: Boolean(workflowId),
    staleTime: 30_000,
  });
}

export function useCreateWorkflowSchedule(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: WorkflowScheduleCreate) => createWorkflowSchedule(workflowId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.schedules(workflowId) });
      toast.success("Schedule created.");
    },
    onError: (err) => toast.error(messageFor(err, "Failed to create schedule.")),
  });
}

export function useDeleteWorkflowSchedule(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (scheduleId: string) => deleteWorkflowSchedule(workflowId, scheduleId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.schedules(workflowId) });
      toast.success("Schedule deleted.");
    },
    onError: (err) => toast.error(messageFor(err, "Failed to delete schedule.")),
  });
}

// --- Runs ---
export function useWorkflowRuns(workflowId: string | null | undefined) {
  return useQuery({
    queryKey: workflowKeys.runs(workflowId ?? ""),
    queryFn: ({ signal }) => listWorkflowRuns(workflowId as string, signal),
    enabled: Boolean(workflowId),
    refetchInterval: 5_000,
  });
}

export function useWorkflowRun(
  workflowId: string | null | undefined,
  runId: string | null | undefined,
) {
  return useQuery({
    queryKey: workflowKeys.run(runId ?? ""),
    queryFn: ({ signal }) => getWorkflowRun(workflowId as string, runId as string, signal),
    enabled: Boolean(workflowId && runId),
    staleTime: 5_000,
  });
}

export function useCreateWorkflowRun(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: WorkflowRunCreate) => createWorkflowRun(workflowId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.runs(workflowId) });
      toast.success("Workflow run started.");
    },
    onError: (err) => toast.error(messageFor(err, "Failed to start workflow run.")),
  });
}

export function useRetryWorkflowRun(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) => retryWorkflowRun(workflowId, runId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.runs(workflowId) });
      toast.success("Workflow run retry initiated.");
    },
    onError: (err) => toast.error(messageFor(err, "Failed to retry workflow run.")),
  });
}

export function useCancelWorkflowRun(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) => cancelWorkflowRun(workflowId, runId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.runs(workflowId) });
      toast.success("Workflow run cancelled.");
    },
    onError: (err) => toast.error(messageFor(err, "Failed to cancel workflow run.")),
  });
}
