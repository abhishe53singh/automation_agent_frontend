import { z } from "zod";
import { apiJson, apiVoid, parseWith, TIMEOUTS, definedOnly } from "@/shared/lib/api";
import { mcpServerSchema, mcpToolSchema, type McpServer, type McpTool } from "./schemas";

const serverListSchema = z.array(mcpServerSchema);
const toolListSchema = z.array(mcpToolSchema);
const enc = (v: string) => encodeURIComponent(v);

export const mcpKeys = {
  all: ["mcp"] as const,
  servers: () => ["mcp", "servers"] as const,
  server: (id: string) => ["mcp", "server", id] as const,
  tools: (serverId: string) => ["mcp", "server", serverId, "tools"] as const,
};

export function listMcpServers(signal?: AbortSignal): Promise<McpServer[]> {
  return apiJson("/api/mcp/servers", { signal }, (data) =>
    parseWith(serverListSchema, data, "GET /api/mcp/servers"),
  );
}

export function createMcpServer(
  input: { name: string; command: string; args?: string[] },
  signal?: AbortSignal,
): Promise<McpServer> {
  return apiJson(
    "/api/mcp/servers",
    { method: "POST", body: input, signal, timeoutMs: TIMEOUTS.mutation },
    (data) => parseWith(mcpServerSchema, data, "POST /api/mcp/servers"),
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

export function updateMcpTool(
  serverId: string,
  toolId: string,
  patch: { permission?: "allowed" | "requires_confirmation" | "blocked" },
  signal?: AbortSignal,
): Promise<McpTool> {
  return apiJson(
    `/api/mcp/servers/${enc(serverId)}/tools/${enc(toolId)}`,
    { method: "PATCH", body: definedOnly(patch), signal, timeoutMs: TIMEOUTS.mutation },
    (data) => parseWith(mcpToolSchema, data, "PATCH /api/mcp/servers/{id}/tools/{toolId}"),
  );
}

