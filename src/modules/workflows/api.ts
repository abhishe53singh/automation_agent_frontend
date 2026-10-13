import { z } from "zod";
import { apiJson, apiVoid, parseWith, TIMEOUTS, definedOnly } from "@/shared/lib/api";
import {
  workflowSchema,
  workflowRunSchema,
  type Workflow,
  type WorkflowCreate,
  type WorkflowRun,
} from "./schemas";

const workflowListSchema = z.array(workflowSchema);
const runListSchema = z.array(workflowRunSchema);
const enc = (v: string) => encodeURIComponent(v);

export const workflowKeys = {
  all: ["workflows"] as const,
  list: (projectId?: string) => ["workflows", "list", { projectId }] as const,
  detail: (id: string) => ["workflows", "detail", id] as const,
  runs: (workflowId: string) => ["workflows", "runs", workflowId] as const,
};

export function listWorkflows(projectId?: string, signal?: AbortSignal): Promise<Workflow[]> {
  return apiJson(
    "/api/workflows",
    { signal, query: { projectId } },
    (data) => parseWith(workflowListSchema, data, "GET /api/workflows"),
  );
}

export function getWorkflow(id: string, signal?: AbortSignal): Promise<Workflow> {
  return apiJson(`/api/workflows/${enc(id)}`, { signal }, (data) =>
    parseWith(workflowSchema, data, "GET /api/workflows/{id}"),
  );
}

export function createWorkflow(input: WorkflowCreate, signal?: AbortSignal): Promise<Workflow> {
  return apiJson(
    "/api/workflows",
    { method: "POST", body: input, signal, timeoutMs: TIMEOUTS.mutation },
    (data) => parseWith(workflowSchema, data, "POST /api/workflows"),
  );
}

export function updateWorkflow(
  id: string,
  patch: Partial<WorkflowCreate>,
  signal?: AbortSignal,
): Promise<Workflow> {
  return apiJson(
    `/api/workflows/${enc(id)}`,
    { method: "PATCH", body: definedOnly(patch), signal, timeoutMs: TIMEOUTS.mutation },
    (data) => parseWith(workflowSchema, data, "PATCH /api/workflows/{id}"),
  );
}

export function deleteWorkflow(id: string, signal?: AbortSignal): Promise<void> {
  return apiVoid(`/api/workflows/${enc(id)}`, { method: "DELETE", signal });
}

export function listWorkflowRuns(workflowId: string, signal?: AbortSignal): Promise<WorkflowRun[]> {
  return apiJson(`/api/workflows/${enc(workflowId)}/runs`, { signal }, (data) =>
    parseWith(runListSchema, data, "GET /api/workflows/{id}/runs"),
  );
}

export function triggerWorkflowRun(workflowId: string, signal?: AbortSignal): Promise<WorkflowRun> {
  return apiJson(
    `/api/workflows/${enc(workflowId)}/runs`,
    { method: "POST", signal, timeoutMs: 30_000 },
    (data) => parseWith(workflowRunSchema, data, "POST /api/workflows/{id}/runs"),
  );
}

