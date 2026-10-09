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
  providers: () => ["llm", "providers"] as const,
  provider: (providerId: string) => ["llm", "providers", providerId] as const,
  models: (providerId?: string) =>
    providerId ? (["llm", "models", providerId] as const) : (["llm", "models"] as const),
  model: (modelId: string) => ["llm", "models", "detail", modelId] as const,
};

const providerListSchema = z.array(llmProviderSchema);
const modelListSchema = z.array(llmModelSchema);

const id = (value: string) => encodeURIComponent(value);

/** GET /api/llm/providers. */
export function listProviders(signal?: AbortSignal): Promise<LlmProvider[]> {
  return apiJson("/api/llm/providers", { signal }, (value) =>
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
 * DELETE /api/llm/providers/{id}.
 * Answers 409 `error.conflict` when the provider's models are referenced by
 * chat history (the BFF maps the upstream IntegrityError) — the UI turns that
 * into "in use by chat history" instead of a generic failure.
 */
export function deleteProvider(providerId: string, signal?: AbortSignal): Promise<void> {
  return apiVoid(`/api/llm/providers/${id(providerId)}`, { method: "DELETE", signal });
}

/** GET /api/llm/models?providerId= */
export function listModels(providerId?: string, signal?: AbortSignal): Promise<LlmModel[]> {
  return apiJson("/api/llm/models", { signal, query: { providerId } }, (value) =>
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

/** DELETE /api/llm/models/{id} — 409 when chat history references the model. */
export function deleteModel(modelId: string, signal?: AbortSignal): Promise<void> {
  return apiVoid(`/api/llm/models/${id(modelId)}`, { method: "DELETE", signal });
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
