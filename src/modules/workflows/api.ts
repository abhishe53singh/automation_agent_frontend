import { z } from "zod";
import { apiJson, apiVoid, parseWith, TIMEOUTS, definedOnly } from "@/shared/lib/api";
import {
  workflowSchema,
  workflowStepSchema,
  workflowScheduleSchema,
  workflowRunSchema,
  type Workflow,
  type WorkflowCreate,
  type WorkflowUpdate,
  type WorkflowStep,
  type WorkflowStepCreate,
  type WorkflowStepUpdate,
  type WorkflowSchedule,
  type WorkflowScheduleCreate,
  type WorkflowRun,
  type WorkflowRunCreate,
} from "./schemas";

const workflowListSchema = z.array(workflowSchema);
const stepListSchema = z.array(workflowStepSchema);
const scheduleListSchema = z.array(workflowScheduleSchema);
const runListSchema = z.array(workflowRunSchema);
const enc = (v: string) => encodeURIComponent(v);

export const workflowKeys = {
  all: ["workflows"] as const,
  list: () => ["workflows", "list"] as const,
  detail: (id: string) => ["workflows", "detail", id] as const,
  steps: (workflowId: string) => ["workflows", workflowId, "steps"] as const,
  schedules: (workflowId: string) => ["workflows", workflowId, "schedules"] as const,
  runs: (workflowId: string) => ["workflows", workflowId, "runs"] as const,
  run: (runId: string) => ["workflows", "run", runId] as const,
};

export function listWorkflows(signal?: AbortSignal): Promise<Workflow[]> {
  return apiJson("/api/workflows", { signal }, (data) =>
    parseWith(workflowListSchema, data, "GET /api/workflows"),
  );
}

export function getWorkflow(id: string, signal?: AbortSignal): Promise<Workflow> {
  return apiJson(`/api/workflows/${enc(id)}`, { signal }, (data) =>
    parseWith(workflowSchema, data, `GET /api/workflows/${id}`),
  );
}

export function createWorkflow(
  input: WorkflowCreate,
  signal?: AbortSignal,
): Promise<Workflow> {
  return apiJson(
    "/api/workflows",
    { method: "POST", body: input, signal, timeoutMs: TIMEOUTS.mutation },
    (data) => parseWith(workflowSchema, data, "POST /api/workflows"),
  );
}

export function updateWorkflow(
  id: string,
  patch: WorkflowUpdate,
  signal?: AbortSignal,
): Promise<Workflow> {
  return apiJson(
    `/api/workflows/${enc(id)}`,
    { method: "PATCH", body: definedOnly(patch), signal, timeoutMs: TIMEOUTS.mutation },
    (data) => parseWith(workflowSchema, data, `PATCH /api/workflows/${id}`),
  );
}

export function deleteWorkflow(id: string, signal?: AbortSignal): Promise<void> {
  return apiVoid(`/api/workflows/${enc(id)}`, { method: "DELETE", signal });
}

// --- Steps ---
export function listWorkflowSteps(
  workflowId: string,
  signal?: AbortSignal,
): Promise<WorkflowStep[]> {
  return apiJson(`/api/workflows/${enc(workflowId)}/steps`, { signal }, (data) =>
    parseWith(stepListSchema, data, "GET /api/workflows/{id}/steps"),
  );
}

export function createWorkflowStep(
  workflowId: string,
  input: WorkflowStepCreate,
  signal?: AbortSignal,
): Promise<WorkflowStep> {
  return apiJson(
    `/api/workflows/${enc(workflowId)}/steps`,
    { method: "POST", body: input, signal, timeoutMs: TIMEOUTS.mutation },
    (data) => parseWith(workflowStepSchema, data, "POST /api/workflows/{id}/steps"),
  );
}

export function updateWorkflowStep(
  workflowId: string,
  stepId: string,
  patch: WorkflowStepUpdate,
  signal?: AbortSignal,
): Promise<WorkflowStep> {
  return apiJson(
    `/api/workflows/${enc(workflowId)}/steps/${enc(stepId)}`,
    { method: "PATCH", body: definedOnly(patch), signal, timeoutMs: TIMEOUTS.mutation },
    (data) => parseWith(workflowStepSchema, data, "PATCH /api/workflows/{id}/steps/{stepId}"),
  );
}

export function deleteWorkflowStep(
  workflowId: string,
  stepId: string,
  signal?: AbortSignal,
): Promise<void> {
  return apiVoid(`/api/workflows/${enc(workflowId)}/steps/${enc(stepId)}`, {
    method: "DELETE",
    signal,
  });
}

// --- Schedules ---
export function listWorkflowSchedules(
  workflowId: string,
  signal?: AbortSignal,
): Promise<WorkflowSchedule[]> {
  return apiJson(`/api/workflows/${enc(workflowId)}/schedules`, { signal }, (data) =>
    parseWith(scheduleListSchema, data, "GET /api/workflows/{id}/schedules"),
  );
}

export function createWorkflowSchedule(
  workflowId: string,
  input: WorkflowScheduleCreate,
  signal?: AbortSignal,
): Promise<WorkflowSchedule> {
  return apiJson(
    `/api/workflows/${enc(workflowId)}/schedules`,
    { method: "POST", body: input, signal, timeoutMs: TIMEOUTS.mutation },
    (data) => parseWith(workflowScheduleSchema, data, "POST /api/workflows/{id}/schedules"),
  );
}

export function deleteWorkflowSchedule(
  workflowId: string,
  scheduleId: string,
  signal?: AbortSignal,
): Promise<void> {
  return apiVoid(`/api/workflows/${enc(workflowId)}/schedules/${enc(scheduleId)}`, {
    method: "DELETE",
    signal,
  });
}

// --- Runs ---
export function listWorkflowRuns(
  workflowId: string,
  signal?: AbortSignal,
): Promise<WorkflowRun[]> {
  return apiJson(`/api/workflows/${enc(workflowId)}/runs`, { signal }, (data) =>
    parseWith(runListSchema, data, "GET /api/workflows/{id}/runs"),
  );
}

export function getWorkflowRun(
  workflowId: string,
  runId: string,
  signal?: AbortSignal,
): Promise<WorkflowRun> {
  return apiJson(`/api/workflows/${enc(workflowId)}/runs/${enc(runId)}`, { signal }, (data) =>
    parseWith(workflowRunSchema, data, "GET /api/workflows/{id}/runs/{runId}"),
  );
}

export function createWorkflowRun(
  workflowId: string,
  input: WorkflowRunCreate,
  signal?: AbortSignal,
): Promise<WorkflowRun> {
  return apiJson(
    `/api/workflows/${enc(workflowId)}/runs`,
    { method: "POST", body: input, signal, timeoutMs: TIMEOUTS.mutation },
    (data) => parseWith(workflowRunSchema, data, "POST /api/workflows/{id}/runs"),
  );
}

export function retryWorkflowRun(
  workflowId: string,
  runId: string,
  signal?: AbortSignal,
): Promise<WorkflowRun> {
  return apiJson(
    `/api/workflows/${enc(workflowId)}/runs/${enc(runId)}/retry`,
    { method: "POST", signal, timeoutMs: TIMEOUTS.mutation },
    (data) => parseWith(workflowRunSchema, data, "POST /api/workflows/{id}/runs/{runId}/retry"),
  );
}

export function cancelWorkflowRun(
  workflowId: string,
  runId: string,
  signal?: AbortSignal,
): Promise<WorkflowRun> {
  return apiJson(
    `/api/workflows/${enc(workflowId)}/runs/${enc(runId)}/cancel`,
    { method: "POST", signal, timeoutMs: TIMEOUTS.mutation },
    (data) => parseWith(workflowRunSchema, data, "POST /api/workflows/{id}/runs/{runId}/cancel"),
  );
}
