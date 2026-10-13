import { z } from "zod";
import { apiJson, apiVoid, parseWith, TIMEOUTS, definedOnly } from "@/shared/lib/api";
import {
  agentSchema,
  agentRunSchema,
  type Agent,
  type AgentCreate,
  type AgentRun,
} from "./schemas";

const agentListSchema = z.array(agentSchema);
const runListSchema = z.array(agentRunSchema);
const enc = (v: string) => encodeURIComponent(v);

export const agentKeys = {
  all: ["agents"] as const,
  list: (isActive?: boolean) => ["agents", "list", { isActive }] as const,
  detail: (id: string) => ["agents", "detail", id] as const,
  runs: (agentId: string) => ["agents", "runs", agentId] as const,
};

export function listAgents(isActive?: boolean, signal?: AbortSignal): Promise<Agent[]> {
  return apiJson(
    "/api/agents",
    { signal, query: { isActive: isActive !== undefined ? String(isActive) : undefined } },
    (data) => parseWith(agentListSchema, data, "GET /api/agents"),
  );
}

export function getAgent(id: string, signal?: AbortSignal): Promise<Agent> {
  return apiJson(`/api/agents/${enc(id)}`, { signal }, (data) =>
    parseWith(agentSchema, data, "GET /api/agents/{id}"),
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
  patch: Partial<AgentCreate>,
  signal?: AbortSignal,
): Promise<Agent> {
  return apiJson(
    `/api/agents/${enc(id)}`,
    { method: "PATCH", body: definedOnly(patch), signal, timeoutMs: TIMEOUTS.mutation },
    (data) => parseWith(agentSchema, data, "PATCH /api/agents/{id}"),
  );
}

export function deleteAgent(id: string, signal?: AbortSignal): Promise<void> {
  return apiVoid(`/api/agents/${enc(id)}`, { method: "DELETE", signal });
}

export function listAgentRuns(agentId: string, signal?: AbortSignal): Promise<AgentRun[]> {
  return apiJson(`/api/agents/${enc(agentId)}/runs`, { signal }, (data) =>
    parseWith(runListSchema, data, "GET /api/agents/{id}/runs"),
  );
}

export function startAgentRun(
  agentId: string,
  input?: { input_text?: string },
  signal?: AbortSignal,
): Promise<AgentRun> {
  return apiJson(
    `/api/agents/${enc(agentId)}/runs`,
    { method: "POST", body: input ?? {}, signal, timeoutMs: 30_000 },
    (data) => parseWith(agentRunSchema, data, "POST /api/agents/{id}/runs"),
  );
}

