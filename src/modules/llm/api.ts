import { z } from "zod";

import { TIMEOUTS, apiJson, apiVoid, definedOnly, parseWith } from "@/shared/lib/api";

import {
  chatCompletionRequestSchema,
  chatCompletionResponseSchema,
  llmChatMessageSchema,
  llmModelSchema,
  llmProviderSchema,
  type ChatCompletionRequest,
  type ChatCompletionResponse,
  type LlmChatMessage,
  type LlmModel,
  type LlmProvider,
  type ModelCreate,
  type ModelUpdate,
  type ProviderCreate,
  type ProviderUpdate,
  type RegistryStatus,
} from "./schemas";

/**
 * LLM registry API client (.agent/API.md #20-#29, upstream #20-#29).
 *
 * The registry is the catalogue of providers and the models chats can select.
 * A provider may store its key in the DB (`api_key` on create/update); the key
 * itself is NEVER returned — responses only carry the `has_api_key` flag, and
 * `api_key_env` remains as the legacy env-var-name fallback.
 */

export const llmKeys = {
  all: ["llm"] as const,
  providers: (status?: RegistryStatus) =>
    status ? (["llm", "providers", "status", status] as const) : (["llm", "providers"] as const),
  provider: (providerId: string) => ["llm", "providers", providerId] as const,
  models: (providerId?: string, status?: RegistryStatus) =>
    status
      ? (["llm", "models", providerId ?? "all", "status", status] as const)
      : providerId
        ? (["llm", "models", providerId] as const)
        : (["llm", "models"] as const),
  model: (modelId: string) => ["llm", "models", "detail", modelId] as const,
};

const providerListSchema = z.array(llmProviderSchema);
const modelListSchema = z.array(llmModelSchema);

const id = (value: string) => encodeURIComponent(value);

/** GET /api/llm/providers — `status` omitted = everything except deleted. */
export function listProviders(
  status?: RegistryStatus,
  signal?: AbortSignal,
): Promise<LlmProvider[]> {
  return apiJson("/api/llm/providers", { signal, query: { status } }, (value) =>
    parseWith(providerListSchema, value, "GET /api/llm/providers"),
  );
}

/** POST /api/llm/providers — 400 (validation) when the name is taken. */
export function createProvider(input: ProviderCreate, signal?: AbortSignal): Promise<LlmProvider> {
  return apiJson(
    "/api/llm/providers",
    { method: "POST", body: input, signal, timeoutMs: TIMEOUTS.mutation },
    (value) => parseWith(llmProviderSchema, value, "POST /api/llm/providers"),
  );
}

/** PATCH /api/llm/providers/{id} — partial; `null` clears an optional field. */
export function updateProvider(
  providerId: string,
  input: ProviderUpdate,
  signal?: AbortSignal,
): Promise<LlmProvider> {
  return apiJson(
    `/api/llm/providers/${id(providerId)}`,
    {
      method: "PATCH",
      body: definedOnly(input as Record<string, unknown>),
      signal,
      timeoutMs: TIMEOUTS.mutation,
    },
    (value) => parseWith(llmProviderSchema, value, "PATCH /api/llm/providers/{id}"),
  );
}

/**
 * DELETE /api/llm/providers/{id} — SOFT delete: the provider moves to the
 * Deleted tab and its models become unavailable (their rows and every chat
 * that used them are kept). Restore undoes it.
 */
export function deleteProvider(providerId: string, signal?: AbortSignal): Promise<void> {
  return apiVoid(`/api/llm/providers/${id(providerId)}`, { method: "DELETE", signal });
}

/** GET /api/llm/models?providerId=&status= — `status` omitted = all but deleted. */
export function listModels(
  providerId?: string,
  signal?: AbortSignal,
  status?: RegistryStatus,
): Promise<LlmModel[]> {
  return apiJson("/api/llm/models", { signal, query: { providerId, status } }, (value) =>
    parseWith(modelListSchema, value, "GET /api/llm/models"),
  );
}

/** POST /api/llm/models. */
export function createModel(input: ModelCreate, signal?: AbortSignal): Promise<LlmModel> {
  return apiJson(
    "/api/llm/models",
    { method: "POST", body: input, signal, timeoutMs: TIMEOUTS.mutation },
    (value) => parseWith(llmModelSchema, value, "POST /api/llm/models"),
  );
}

/** PATCH /api/llm/models/{id} — partial; `null` clears a limit. */
export function updateModel(
  modelId: string,
  input: ModelUpdate,
  signal?: AbortSignal,
): Promise<LlmModel> {
  return apiJson(
    `/api/llm/models/${id(modelId)}`,
    {
      method: "PATCH",
      body: definedOnly(input as Record<string, unknown>),
      signal,
      timeoutMs: TIMEOUTS.mutation,
    },
    (value) => parseWith(llmModelSchema, value, "PATCH /api/llm/models/{id}"),
  );
}

/** DELETE /api/llm/models/{id} — SOFT delete (moves to Deleted; restorable). */
export function deleteModel(modelId: string, signal?: AbortSignal): Promise<void> {
  return apiVoid(`/api/llm/models/${id(modelId)}`, { method: "DELETE", signal });
}

export type LifecycleAction = "archive" | "restore";

/** POST /api/llm/providers/{id}/archive | restore (restore = unarchive or undelete). */
export function setProviderLifecycle(
  providerId: string,
  action: LifecycleAction,
): Promise<LlmProvider> {
  return apiJson(
    `/api/llm/providers/${id(providerId)}/${action}`,
    { method: "POST", timeoutMs: TIMEOUTS.mutation },
    (value) => parseWith(llmProviderSchema, value, `POST /api/llm/providers/{id}/${action}`),
  );
}

/** POST /api/llm/models/{id}/archive | restore (restore = unarchive or undelete). */
export function setModelLifecycle(modelId: string, action: LifecycleAction): Promise<LlmModel> {
  return apiJson(
    `/api/llm/models/${id(modelId)}/${action}`,
    { method: "POST", timeoutMs: TIMEOUTS.mutation },
    (value) => parseWith(llmModelSchema, value, `POST /api/llm/models/{id}/${action}`),
  );
}

/**
 * Build a chat-completions request for a STORED provider + model.
 *
 * `provider` and `model` are required by the backend schema even when
 * `model_id` is present — they are pulled from the stored objects here so the
 * caller can never forget them. The backend resolves the API key from the DB
 * via `model_id`, so no secret is ever handled by the browser.
 */
export function buildStoredModelChatRequest(args: {
  provider: Pick<LlmProvider, "id" | "name">;
  model: Pick<LlmModel, "id" | "name">;
  messages: LlmChatMessage[];
  temperature?: number | null;
  max_tokens?: number | null;
  top_p?: number | null;
  stop?: string[] | null;
}): ChatCompletionRequest {
  return {
    provider_id: args.provider.id,
    model_id: args.model.id,
    provider: args.provider.name,
    model: args.model.name,
    messages: args.messages,
    ...(args.temperature !== undefined ? { temperature: args.temperature } : {}),
    ...(args.max_tokens !== undefined ? { max_tokens: args.max_tokens } : {}),
    ...(args.top_p !== undefined ? { top_p: args.top_p } : {}),
    ...(args.stop !== undefined ? { stop: args.stop } : {}),
  };
}

/**
 * POST /api/llm/chat/completions — the unified chat endpoint.
 *
 * Accepts both addressing modes: stored IDs (`provider_id`/`model_id`, key
 * resolved server-side from the DB) and ad-hoc (`provider` + `model` names
 * with an `api_key` override). `provider` and `model` are required in every
 * case — use `buildStoredModelChatRequest` to fill them from stored objects.
 */
export function chatCompletion(
  input: ChatCompletionRequest,
  signal?: AbortSignal,
): Promise<ChatCompletionResponse> {
  return apiJson(
    "/api/llm/chat/completions",
    // LLM round-trips legitimately exceed the default budget.
    { method: "POST", body: input, signal, timeoutMs: TIMEOUTS.upload },
    (value) => parseWith(chatCompletionResponseSchema, value, "POST /api/llm/chat/completions"),
  );
}

export { chatCompletionRequestSchema, llmChatMessageSchema, llmModelSchema, llmProviderSchema };
export type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  LlmChatMessage,
  LlmModel,
  LlmProvider,
  ModelCreate,
  ModelUpdate,
  ProviderCreate,
  ProviderUpdate,
};

export type BulkAction = "archive" | "unarchive" | "delete" | "restore" | "purge";

const bulkResultSchema = z.object({
  action: z.string(),
  updated: z.array(z.string()),
  skipped: z.array(z.object({ id: z.string(), reason: z.string() })),
});
export type BulkResult = z.infer<typeof bulkResultSchema>;

/** POST /api/llm/{providers|models}/bulk — many records, one action. */
export function bulkLifecycle(
  kind: "providers" | "models",
  ids: string[],
  action: BulkAction,
): Promise<BulkResult> {
  return apiJson(
    `/api/llm/${kind}/bulk`,
    { method: "POST", body: { ids, action }, timeoutMs: 35_000 },
    (value) => parseWith(bulkResultSchema, value, `POST /api/llm/${kind}/bulk`),
  );
}

const purgeImpactSchema = z.object({
  models: z.number(),
  responses: z.number(),
  chats: z.number(),
  widgets: z.number(),
  providers: z.number().optional(),
});
export type PurgeImpact = z.infer<typeof purgeImpactSchema>;

/** What permanently deleting these records would remove (changes nothing). */
export function previewPurge(
  kind: "providers" | "models",
  ids: string[],
  signal?: AbortSignal,
): Promise<PurgeImpact> {
  return apiJson(
    `/api/llm/${kind}/purge-preview`,
    { method: "POST", body: { ids }, signal },
    (value) => parseWith(purgeImpactSchema, value, `POST /api/llm/${kind}/purge-preview`),
  );
}

/** DELETE /api/llm/{kind}/{id}/permanent — only for records in the Deleted tab. */
export function purgeOne(kind: "providers" | "models", recordId: string): Promise<void> {
  return apiVoid(`/api/llm/${kind}/${id(recordId)}/permanent`, {
    method: "DELETE",
    timeoutMs: 35_000,
  });
}

// ---------------------------------------------------------------------------
// Backup / restore (password-encrypted file of every provider + model)
// ---------------------------------------------------------------------------

const registrySummarySchema = z
  .object({
    providers: z.number(),
    models: z.number(),
    providers_with_key: z.number().default(0),
    exported_at: z.string().nullable().optional(),
  })
  .passthrough();

const registryExportSchema = z.object({
  filename: z.string(),
  bundle: z.record(z.string(), z.unknown()),
  summary: registrySummarySchema,
});
export type RegistryExport = z.infer<typeof registryExportSchema>;

const registryImportSchema = z.object({
  summary: registrySummarySchema,
  providers_created: z.number(),
  providers_updated: z.number(),
  models_created: z.number(),
  models_updated: z.number(),
});
export type RegistryImportResult = z.infer<typeof registryImportSchema>;

/** Same file container as the integrations export, with its own `format`. */
export const REGISTRY_BUNDLE_FORMAT = "automation-agent-llm-registry";

export function exportRegistry(password: string): Promise<RegistryExport> {
  return apiJson(
    "/api/llm/registry/export",
    { method: "POST", body: { password }, timeoutMs: 35_000 },
    (data) => parseWith(registryExportSchema, data, "POST /api/llm/registry/export"),
  );
}

export function importRegistry(
  password: string,
  bundle: Record<string, unknown>,
): Promise<RegistryImportResult> {
  return apiJson(
    "/api/llm/registry/import",
    { method: "POST", body: { password, bundle }, timeoutMs: 65_000 },
    (data) => parseWith(registryImportSchema, data, "POST /api/llm/registry/import"),
  );
}
