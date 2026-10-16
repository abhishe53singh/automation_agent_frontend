import { z } from "zod";
import { apiJson, apiVoid, parseWith, TIMEOUTS, definedOnly } from "@/shared/lib/api";
import {
  agentSchema,
  agentToolSchema,
  agentRunSchema,
  agentStepSchema,
  type Agent,
  type AgentCreate,
  type AgentUpdate,
  type AgentTool,
  type AgentToolCreate,
  type AgentToolUpdate,
  type AgentRun,
  type AgentRunCreate,
  type AgentStep,
  type AgentStepCreate,
  type AgentStepUpdate,
} from "./schemas";

const agentListSchema = z.array(agentSchema);
const toolListSchema = z.array(agentToolSchema);
const runListSchema = z.array(agentRunSchema);
const stepListSchema = z.array(agentStepSchema);
const enc = (v: string) => encodeURIComponent(v);

export const agentKeys = {
  all: ["agents"] as const,
  list: () => ["agents", "list"] as const,
  detail: (id: string) => ["agents", "detail", id] as const,
  tools: (agentId: string) => ["agents", agentId, "tools"] as const,
  runs: (agentId: string) => ["agents", agentId, "runs"] as const,
  run: (runId: string) => ["agents", "run", runId] as const,
  steps: (runId: string) => ["agents", "run", runId, "steps"] as const,
};

export function listAgents(signal?: AbortSignal): Promise<Agent[]> {
  return apiJson("/api/agents", { signal }, (data) =>
    parseWith(agentListSchema, data, "GET /api/agents"),
  );
}

export function getAgent(id: string, signal?: AbortSignal): Promise<Agent> {
  return apiJson(`/api/agents/${enc(id)}`, { signal }, (data) =>
    parseWith(agentSchema, data, `GET /api/agents/${id}`),
  );
}

export function createAgent(input: AgentCreate, signal?: AbortSignal): Promise<Agent> {
  return apiJson(
    "/api/agents",
    { method: "POST", body: input, signal, timeoutMs: TIMEOUTS.mutation },
    (data) => parseWith(agentSchema, data, "POST /api/agents"),
  );
}

export function updateAgent(
  id: string,
  patch: AgentUpdate,
  signal?: AbortSignal,
): Promise<Agent> {
  return apiJson(
    `/api/agents/${enc(id)}`,
    { method: "PATCH", body: definedOnly(patch), signal, timeoutMs: TIMEOUTS.mutation },
    (data) => parseWith(agentSchema, data, `PATCH /api/agents/${id}`),
  );
}

export function deleteAgent(id: string, signal?: AbortSignal): Promise<void> {
  return apiVoid(`/api/agents/${enc(id)}`, { method: "DELETE", signal });
}

// --- Tools ---
export function listAgentTools(agentId: string, signal?: AbortSignal): Promise<AgentTool[]> {
  return apiJson(`/api/agents/${enc(agentId)}/tools`, { signal }, (data) =>
    parseWith(toolListSchema, data, "GET /api/agents/{id}/tools"),
  );
}

export function createAgentTool(
  agentId: string,
  input: AgentToolCreate,
  signal?: AbortSignal,
): Promise<AgentTool> {
  return apiJson(
    `/api/agents/${enc(agentId)}/tools`,
    { method: "POST", body: input, signal, timeoutMs: TIMEOUTS.mutation },
    (data) => parseWith(agentToolSchema, data, "POST /api/agents/{id}/tools"),
  );
}

export function updateAgentTool(
  agentId: string,
  toolId: string,
  patch: AgentToolUpdate,
  signal?: AbortSignal,
): Promise<AgentTool> {
  return apiJson(
    `/api/agents/${enc(agentId)}/tools/${enc(toolId)}`,
    { method: "PATCH", body: definedOnly(patch), signal, timeoutMs: TIMEOUTS.mutation },
    (data) => parseWith(agentToolSchema, data, "PATCH /api/agents/{id}/tools/{toolId}"),
  );
}

export function deleteAgentTool(
  agentId: string,
  toolId: string,
  signal?: AbortSignal,
): Promise<void> {
  return apiVoid(`/api/agents/${enc(agentId)}/tools/${enc(toolId)}`, {
    method: "DELETE",
    signal,
  });
}

// --- Runs ---
export function listAgentRuns(agentId: string, signal?: AbortSignal): Promise<AgentRun[]> {
  return apiJson(`/api/agents/${enc(agentId)}/runs`, { signal }, (data) =>
    parseWith(runListSchema, data, "GET /api/agents/{id}/runs"),
  );
}

export function getAgentRun(runId: string, signal?: AbortSignal): Promise<AgentRun> {
  return apiJson(`/api/agents/runs/${enc(runId)}`, { signal }, (data) =>
    parseWith(agentRunSchema, data, `GET /api/agents/runs/${runId}`),
  );
}

export function createAgentRun(
  agentId: string,
  input: AgentRunCreate,
  signal?: AbortSignal,
): Promise<AgentRun> {
  return apiJson(
    `/api/agents/${enc(agentId)}/runs`,
    { method: "POST", body: input, signal, timeoutMs: TIMEOUTS.mutation },
    (data) => parseWith(agentRunSchema, data, "POST /api/agents/{id}/runs"),
  );
}

// --- Steps ---
export function listAgentSteps(runId: string, signal?: AbortSignal): Promise<AgentStep[]> {
  return apiJson(`/api/agents/runs/${enc(runId)}/steps`, { signal }, (data) =>
    parseWith(stepListSchema, data, "GET /api/agents/runs/{id}/steps"),
  );
}

export function createAgentStep(
  runId: string,
  input: AgentStepCreate,
  signal?: AbortSignal,
): Promise<AgentStep> {
  return apiJson(
    `/api/agents/runs/${enc(runId)}/steps`,
    { method: "POST", body: input, signal, timeoutMs: TIMEOUTS.mutation },
    (data) => parseWith(agentStepSchema, data, "POST /api/agents/runs/{id}/steps"),
  );
}

export function updateAgentStep(
  runId: string,
  stepId: string,
  patch: AgentStepUpdate,
  signal?: AbortSignal,
): Promise<AgentStep> {
  return apiJson(
    `/api/agents/runs/${enc(runId)}/steps/${enc(stepId)}`,
    { method: "PATCH", body: definedOnly(patch), signal, timeoutMs: TIMEOUTS.mutation },
    (data) => parseWith(agentStepSchema, data, "PATCH /api/agents/runs/{id}/steps/{stepId}"),
  );
}
