import { z } from "zod";

import { TIMEOUTS, apiJson, apiVoid, buildUrl, definedOnly, parseWith } from "@/shared/lib/api";

import {
  chatMessageSchema,
  chatSessionModelSchema,
  chatSessionSchema,
  chatTurnSchema,
  llmResponseSchema,
  type ChatMessage,
  type ChatSession,
  type ChatSessionModel,
  type ChatTurn,
  type LlmResponse,
  type SessionCreate,
  type SessionUpdate,
  type TurnCreate,
} from "./schemas";

/**
 * Chat module API client (.agent/API.md #30-#42, upstream #30-#42).
 *
 * All calls go to the same-origin BFF. The stream is NOT a function here: it
 * is consumed through `shared/lib/sse` (item 34), which owns an AbortController
 * for the event's lifetime rather than resolving once.
 */

/**
 * Hierarchical query keys (item 30):
 *
 *   ["chat"]                                  root — invalidate everything
 *   ["chat", "sessions"]                      the session list
 *   ["chat", "sessions", id]                  one session
 *   ["chat", "sessions", id, "turns"]         its top-level turns
 *   ["chat", "sessions", id, "turns", turnId] that turn's children (a branch)
 *   ["chat", "sessions", id, "messages"]      the flat message history
 *   ["chat", "sessions", id, "responses", id] one model response
 *
 * The nesting is the invalidation contract: invalidating
 * `["chat","sessions",id]` refreshes the session, its turns AND its messages
 * by prefix — exactly what a freshly submitted turn needs.
 */
export const chatKeys = {
  all: ["chat"] as const,
  sessions: () => ["chat", "sessions"] as const,
  session: (sessionId: string) => ["chat", "sessions", sessionId] as const,
  turns: (sessionId: string) => ["chat", "sessions", sessionId, "turns"] as const,
  turnChildren: (sessionId: string, turnId: string) =>
    ["chat", "sessions", sessionId, "turns", turnId] as const,
  messages: (sessionId: string) => ["chat", "sessions", sessionId, "messages"] as const,
  response: (sessionId: string, responseId: string) =>
    ["chat", "sessions", sessionId, "responses", responseId] as const,
};

const sessionListSchema = z.array(chatSessionSchema);
const turnListSchema = z.array(chatTurnSchema);
const messageListSchema = z.array(chatMessageSchema);

const id = (value: string) => encodeURIComponent(value);

/** GET /api/chat/sessions — archived chats only when `includeArchived`. */
export function listSessions(
  options: { projectId?: string; includeArchived?: boolean } = {},
  signal?: AbortSignal,
): Promise<ChatSession[]> {
  return apiJson(
    "/api/chat/sessions",
    {
      signal,
      query: {
        projectId: options.projectId,
        // Upstream includes archived sessions only on an explicit true, so the
        // flag is sent whenever the caller opted in.
        includeArchived: options.includeArchived ? "true" : undefined,
      },
    },
    (value) => parseWith(sessionListSchema, value, "GET /api/chat/sessions"),
  );
}

/** POST /api/chat/sessions */
export function createSession(input: SessionCreate, signal?: AbortSignal): Promise<ChatSession> {
  return apiJson(
    "/api/chat/sessions",
    { method: "POST", body: input, signal, timeoutMs: TIMEOUTS.mutation },
    (value) => parseWith(chatSessionSchema, value, "POST /api/chat/sessions"),
  );
}

/** GET /api/chat/sessions/{id} — 404 when unknown or not yours (masked). */
export function getSession(sessionId: string, signal?: AbortSignal): Promise<ChatSession> {
  return apiJson(`/api/chat/sessions/${id(sessionId)}`, { signal }, (value) =>
    parseWith(chatSessionSchema, value, "GET /api/chat/sessions/{id}"),
  );
}

/** PATCH /api/chat/sessions/{id} — rename and/or archive. */
export function updateSession(
  sessionId: string,
  input: SessionUpdate,
  signal?: AbortSignal,
): Promise<ChatSession> {
  return apiJson(
    `/api/chat/sessions/${id(sessionId)}`,
    {
      method: "PATCH",
      body: definedOnly(input as Record<string, unknown>),
      signal,
      timeoutMs: TIMEOUTS.mutation,
    },
    (value) => parseWith(chatSessionSchema, value, "PATCH /api/chat/sessions/{id}"),
  );
}

/** DELETE /api/chat/sessions/{id} — turns, messages and responses cascade. */
export function deleteSession(sessionId: string, signal?: AbortSignal): Promise<void> {
  return apiVoid(`/api/chat/sessions/${id(sessionId)}`, { method: "DELETE", signal });
}

/** PUT /api/chat/sessions/{id}/models — DECLARATIVE: the list IS the new set. */
export function setSessionModels(
  sessionId: string,
  modelIds: string[],
  signal?: AbortSignal,
): Promise<ChatSession> {
  return apiJson(
    `/api/chat/sessions/${id(sessionId)}/models`,
    { method: "PUT", body: { model_ids: modelIds }, signal, timeoutMs: TIMEOUTS.mutation },
    (value) => parseWith(chatSessionSchema, value, "PUT /api/chat/sessions/{id}/models"),
  );
}

/** PATCH .../models/{modelId} — enable/disable WITHOUT detaching the model. */
export function setSessionModelEnabled(
  sessionId: string,
  modelId: string,
  isEnabled: boolean,
  signal?: AbortSignal,
): Promise<ChatSessionModel> {
  return apiJson(
    `/api/chat/sessions/${id(sessionId)}/models/${id(modelId)}`,
    { method: "PATCH", body: { is_enabled: isEnabled }, signal, timeoutMs: TIMEOUTS.mutation },
    (value) =>
      parseWith(chatSessionModelSchema, value, "PATCH /api/chat/sessions/{id}/models/{modelId}"),
  );
}

/** POST /api/chat/sessions/{id}/turns — one round; `parent_turn_id` branches. */
export function createTurn(
  sessionId: string,
  input: TurnCreate,
  signal?: AbortSignal,
): Promise<ChatTurn> {
  const payload = definedOnly({
    content: input.content,
    parent_turn_id: input.parent_turn_id,
    model_ids: input.model_ids,
  });

  return apiJson(
    `/api/chat/sessions/${id(sessionId)}/turns`,
    { method: "POST", body: payload, signal, timeoutMs: TIMEOUTS.mutation },
    (value) => parseWith(chatTurnSchema, value, "POST /api/chat/sessions/{id}/turns"),
  );
}

/** GET /api/chat/sessions/{id}/turns — top-level turns, or one turn's children. */
export function listTurns(
  sessionId: string,
  parentTurnId?: string,
  signal?: AbortSignal,
): Promise<ChatTurn[]> {
  return apiJson(
    `/api/chat/sessions/${id(sessionId)}/turns`,
    { signal, query: { parentTurnId } },
    (value) => parseWith(turnListSchema, value, "GET /api/chat/sessions/{id}/turns"),
  );
}

/** GET /api/chat/sessions/{id}/messages — the flat history, in insertion order. */
export function listMessages(sessionId: string, signal?: AbortSignal): Promise<ChatMessage[]> {
  return apiJson(`/api/chat/sessions/${id(sessionId)}/messages`, { signal }, (value) =>
    parseWith(messageListSchema, value, "GET /api/chat/sessions/{id}/messages"),
  );
}

/** GET /api/chat/sessions/{id}/responses/{responseId} */
export function getResponse(
  sessionId: string,
  responseId: string,
  signal?: AbortSignal,
): Promise<LlmResponse> {
  return apiJson(
    `/api/chat/sessions/${id(sessionId)}/responses/${id(responseId)}`,
    { signal },
    (value) =>
      parseWith(llmResponseSchema, value, "GET /api/chat/sessions/{id}/responses/{responseId}"),
  );
}

/** PATCH .../responses/{responseId} — the provider-adapter write path. */
export function updateResponse(
  sessionId: string,
  responseId: string,
  input: Partial<Pick<LlmResponse, "content" | "status">> & {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    latency_ms?: number;
    error_message?: string | null;
  },
  signal?: AbortSignal,
): Promise<LlmResponse> {
  return apiJson(
    `/api/chat/sessions/${id(sessionId)}/responses/${id(responseId)}`,
    {
      method: "PATCH",
      body: definedOnly(input as Record<string, unknown>),
      signal,
      timeoutMs: TIMEOUTS.mutation,
    },
    (value) =>
      parseWith(llmResponseSchema, value, "PATCH /api/chat/sessions/{id}/responses/{responseId}"),
  );
}

/** The SSE URL for a turn — passed to `shared/lib/sse` (item 34). */
export function streamTurnUrl(sessionId: string, turnId: string): string {
  return buildUrl(`/api/chat/sessions/${id(sessionId)}/turns/${id(turnId)}/stream`);
}

export { chatMessageSchema, chatSessionSchema, chatTurnSchema, llmResponseSchema };
export type {
  ChatMessage,
  ChatSession,
  ChatSessionModel,
  ChatTurn,
  LlmResponse,
  SessionCreate,
  SessionUpdate,
  TurnCreate,
};
