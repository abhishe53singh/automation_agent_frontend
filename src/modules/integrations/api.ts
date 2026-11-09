import { z } from "zod";
import { apiJson, apiVoid, parseWith, TIMEOUTS } from "@/shared/lib/api";
import { connectionSchema, type ConnectionCreate, type ProviderConnection } from "./schemas";

const connectionListSchema = z.array(connectionSchema);
const enc = (v: string) => encodeURIComponent(v);

export const integrationKeys = {
  all: ["integrations"] as const,
  connections: () => ["integrations", "connections"] as const,
  connection: (id: string) => ["integrations", "connection", id] as const,
};

export function listConnections(signal?: AbortSignal): Promise<ProviderConnection[]> {
  return apiJson("/api/integrations/connections", { signal }, (data) =>
    parseWith(connectionListSchema, data, "GET /api/integrations/connections"),
  );
}

export function getConnection(id: string, signal?: AbortSignal): Promise<ProviderConnection> {
  return apiJson(`/api/integrations/connections/${enc(id)}`, { signal }, (data) =>
    parseWith(connectionSchema, data, `GET /api/integrations/connections/${id}`),
  );
}

export function createConnection(
  input: ConnectionCreate,
  signal?: AbortSignal,
): Promise<ProviderConnection> {
  return apiJson(
    "/api/integrations/connections",
    { method: "POST", body: input, signal, timeoutMs: TIMEOUTS.mutation },
    (data) => parseWith(connectionSchema, data, "POST /api/integrations/connections"),
  );
}

export function deleteConnection(id: string, signal?: AbortSignal): Promise<void> {
  return apiVoid(`/api/integrations/connections/${enc(id)}`, { method: "DELETE", signal });
}

// ---------------------------------------------------------------------------
// Export / import (password-encrypted file)
// ---------------------------------------------------------------------------

const bundleSummarySchema = z.object({
  connections: z
    .array(
      z.object({ provider: z.string().nullable(), has_refresh_token: z.boolean() }).passthrough(),
    )
    .default([]),
  mcp_servers: z
    .array(z.object({ name: z.string().nullable(), tools: z.number() }).passthrough())
    .default([]),
});

const exportResultSchema = z.object({
  filename: z.string(),
  bundle: z.record(z.string(), z.unknown()),
  summary: bundleSummarySchema,
});
export type IntegrationsExport = z.infer<typeof exportResultSchema>;

const importResultSchema = z.object({
  summary: bundleSummarySchema,
  connections_created: z.number(),
  connections_updated: z.number(),
  connections_skipped: z.array(z.string()).default([]),
  servers_created: z.number(),
  servers_updated: z.number(),
  tools_created: z.number(),
  tools_updated: z.number(),
});
export type IntegrationsImportResult = z.infer<typeof importResultSchema>;

export function exportIntegrations(password: string): Promise<IntegrationsExport> {
  return apiJson(
    "/api/integrations/export",
    { method: "POST", body: { password }, timeoutMs: 35_000 },
    (data) => parseWith(exportResultSchema, data, "POST /api/integrations/export"),
  );
}

export function importIntegrations(
  password: string,
  bundle: Record<string, unknown>,
): Promise<IntegrationsImportResult> {
  return apiJson(
    "/api/integrations/import",
    { method: "POST", body: { password, bundle }, timeoutMs: 35_000 },
    (data) => parseWith(importResultSchema, data, "POST /api/integrations/import"),
  );
}
