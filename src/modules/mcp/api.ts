import { z } from "zod";
import { apiJson, apiVoid, parseWith, TIMEOUTS, definedOnly } from "@/shared/lib/api";
import {
  mcpServerSchema,
  mcpToolSchema,
  toolApprovalSchema,
  type McpServer,
  type McpServerCreate,
  type McpServerUpdate,
  type McpTool,
  type McpToolCreate,
  type McpToolUpdate,
  type ToolApproval,
  type ToolApprovalCreate,
  type ToolApprovalDecide,
} from "./schemas";

const serverListSchema = z.array(mcpServerSchema);
const toolListSchema = z.array(mcpToolSchema);
const approvalListSchema = z.array(toolApprovalSchema);
const enc = (v: string) => encodeURIComponent(v);

export const mcpKeys = {
  all: ["mcp"] as const,
  servers: () => ["mcp", "servers"] as const,
  server: (id: string) => ["mcp", "server", id] as const,
  tools: (serverId: string) => ["mcp", "server", serverId, "tools"] as const,
  approvals: () => ["mcp", "approvals"] as const,
  approval: (id: string) => ["mcp", "approval", id] as const,
};

export function listMcpServers(signal?: AbortSignal): Promise<McpServer[]> {
  return apiJson("/api/mcp/servers", { signal }, (data) =>
    parseWith(serverListSchema, data, "GET /api/mcp/servers"),
  );
}

export function getMcpServer(id: string, signal?: AbortSignal): Promise<McpServer> {
  return apiJson(`/api/mcp/servers/${enc(id)}`, { signal }, (data) =>
    parseWith(mcpServerSchema, data, `GET /api/mcp/servers/${id}`),
  );
}

export function createMcpServer(
  input: McpServerCreate,
  signal?: AbortSignal,
): Promise<McpServer> {
  return apiJson(
    "/api/mcp/servers",
    { method: "POST", body: input, signal, timeoutMs: TIMEOUTS.mutation },
    (data) => parseWith(mcpServerSchema, data, "POST /api/mcp/servers"),
  );
}

export function updateMcpServer(
  id: string,
  patch: McpServerUpdate,
  signal?: AbortSignal,
): Promise<McpServer> {
  return apiJson(
    `/api/mcp/servers/${enc(id)}`,
    { method: "PATCH", body: definedOnly(patch), signal, timeoutMs: TIMEOUTS.mutation },
    (data) => parseWith(mcpServerSchema, data, `PATCH /api/mcp/servers/${id}`),
  );
}

export function deleteMcpServer(id: string, signal?: AbortSignal): Promise<void> {
  return apiVoid(`/api/mcp/servers/${enc(id)}`, { method: "DELETE", signal });
}

export function listMcpTools(serverId: string, signal?: AbortSignal): Promise<McpTool[]> {
  return apiJson(`/api/mcp/servers/${enc(serverId)}/tools`, { signal }, (data) =>
    parseWith(toolListSchema, data, "GET /api/mcp/servers/{id}/tools"),
  );
}

export function createMcpTool(
  serverId: string,
  input: McpToolCreate,
  signal?: AbortSignal,
): Promise<McpTool> {
  return apiJson(
    `/api/mcp/servers/${enc(serverId)}/tools`,
    { method: "POST", body: input, signal, timeoutMs: TIMEOUTS.mutation },
    (data) => parseWith(mcpToolSchema, data, "POST /api/mcp/servers/{id}/tools"),
  );
}

export function updateMcpTool(
  serverId: string,
  toolId: string,
  patch: McpToolUpdate,
  signal?: AbortSignal,
): Promise<McpTool> {
  return apiJson(
    `/api/mcp/servers/${enc(serverId)}/tools/${enc(toolId)}`,
    { method: "PATCH", body: definedOnly(patch), signal, timeoutMs: TIMEOUTS.mutation },
    (data) => parseWith(mcpToolSchema, data, "PATCH /api/mcp/servers/{id}/tools/{toolId}"),
  );
}

export function deleteMcpTool(
  serverId: string,
  toolId: string,
  signal?: AbortSignal,
): Promise<void> {
  return apiVoid(`/api/mcp/servers/${enc(serverId)}/tools/${enc(toolId)}`, {
    method: "DELETE",
    signal,
  });
}

// --- Approvals ---
export function listApprovals(signal?: AbortSignal): Promise<ToolApproval[]> {
  return apiJson("/api/approvals", { signal }, (data) =>
    parseWith(approvalListSchema, data, "GET /api/approvals"),
  );
}

export function createApproval(
  input: ToolApprovalCreate,
  signal?: AbortSignal,
): Promise<ToolApproval> {
  return apiJson(
    "/api/approvals",
    { method: "POST", body: input, signal, timeoutMs: TIMEOUTS.mutation },
    (data) => parseWith(toolApprovalSchema, data, "POST /api/approvals"),
  );
}

export function decideApproval(
  approvalId: string,
  decision: ToolApprovalDecide,
  signal?: AbortSignal,
): Promise<ToolApproval> {
  return apiJson(
    `/api/approvals/${enc(approvalId)}/decision`,
    { method: "POST", body: decision, signal, timeoutMs: TIMEOUTS.mutation },
    (data) => parseWith(toolApprovalSchema, data, "POST /api/approvals/{id}/decision"),
  );
}
