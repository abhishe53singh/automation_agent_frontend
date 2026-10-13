import { z } from "zod";
import { apiJson, apiVoid, parseWith, TIMEOUTS } from "@/shared/lib/api";
import {
  connectionSchema,
  type ConnectionCreate,
  type ProviderConnection,
} from "./schemas";

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

