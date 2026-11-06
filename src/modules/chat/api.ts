import { z } from "zod";

import { TIMEOUTS, apiJson, apiVoid, buildUrl, definedOnly, parseWith } from "@/shared/lib/api";

import {
  chatAttachmentSchema,
  chatAttachmentTypesSchema,
  chatMessageSchema,
  chatSessionModelSchema,
  chatSessionSchema,
  chatToolSchema,
  chatTurnSchema,
  llmResponseSchema,
  type ChatAttachment,
  type ChatAttachmentTypes,
  type ChatMessage,
  type ChatSession,
  type ChatSessionModel,
  type ChatTool,
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
 *   ["chat", "tools"]                         the "+" menu's pickable tools
 *   ["chat", "session", id, "attachments"]    the chat's uploaded files
 *   ["chat", "attachment-types"]              supported attachment extensions
 *
 * The nesting is the invalidation contract: invalidating
 * `["chat","sessions",id]` refreshes the session, its turns AND its messages
 * by prefix — exactly what a freshly submitted turn needs.
 */
export interface SessionListFilters {
  projectId?: string;
  includeArchived?: boolean;
}

export const chatKeys = {
  all: ["chat"] as const,
  list: (filters?: SessionListFilters) => ["chat", "list", filters ?? {}] as const,
  // Keep legacy sessions() alias pointing to list for backward compatibility
  sessions: (filters?: SessionListFilters) => ["chat", "list", filters ?? {}] as const,
  session: (sessionId: string) => ["chat", "session", sessionId] as const,
  turns: (sessionId: string) => ["chat", "session", sessionId, "turns"] as const,
  turnChildren: (sessionId: string, turnId: string) =>
    ["chat", "session", sessionId, "turns", turnId] as const,
  messages: (sessionId: string) => ["chat", "session", sessionId, "messages"] as const,
  response: (sessionId: string, responseId: string) =>
    ["chat", "session", sessionId, "responses", responseId] as const,
  tools: () => ["chat", "tools"] as const,
  attachments: (sessionId: string) => ["chat", "session", sessionId, "attachments"] as const,
  attachmentTypes: () => ["chat", "attachment-types"] as const,
};

const sessionListSchema = z.array(chatSessionSchema);
const turnListSchema = z.array(chatTurnSchema);
const messageListSchema = z.array(chatMessageSchema);
const toolListSchema = z.array(chatToolSchema);
const attachmentListSchema = z.array(chatAttachmentSchema);

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

/** GET /api/chat/tools — tools the composer can attach (unavailable ones included). */
export function listChatTools(signal?: AbortSignal): Promise<ChatTool[]> {
  return apiJson("/api/chat/tools", { signal }, (value) =>
    parseWith(toolListSchema, value, "GET /api/chat/tools"),
  );
}

/** GET /api/chat/attachments/supported-types — allowed extensions + size limit. */
export function getAttachmentTypes(signal?: AbortSignal): Promise<ChatAttachmentTypes> {
  return apiJson("/api/chat/attachments/supported-types", { signal }, (value) =>
    parseWith(chatAttachmentTypesSchema, value, "GET /api/chat/attachments/supported-types"),
  );
}

/** GET /api/chat/sessions/{id}/attachments — the chat's files, newest first. */
export function listAttachments(
  sessionId: string,
  signal?: AbortSignal,
): Promise<ChatAttachment[]> {
  return apiJson(`/api/chat/sessions/${id(sessionId)}/attachments`, { signal }, (value) =>
    parseWith(attachmentListSchema, value, "GET /api/chat/sessions/{id}/attachments"),
  );
}

/**
 * POST /api/chat/sessions/{id}/attachments — one multipart request per batch.
 * Synchronous upstream (parse + embed), so it gets the upload budget. A file
 * that cannot be parsed comes back with `status: "failed"`.
 */
export function uploadAttachments(
  sessionId: string,
  files: readonly File[],
  signal?: AbortSignal,
): Promise<ChatAttachment[]> {
  const form = new FormData();
  for (const file of files) form.append("files", file, file.name);
  return apiJson(
    `/api/chat/sessions/${id(sessionId)}/attachments`,
    // Matches the BFF route's upstream budget (parse + embed is synchronous).
    { method: "POST", body: form, signal, timeoutMs: 185_000 },
    (value) => parseWith(attachmentListSchema, value, "POST /api/chat/sessions/{id}/attachments"),
  );
}

/** DELETE /api/chat/sessions/{id}/attachments/{attachmentId} */
export function deleteAttachment(
  sessionId: string,
  attachmentId: string,
  signal?: AbortSignal,
): Promise<void> {
  return apiVoid(`/api/chat/sessions/${id(sessionId)}/attachments/${id(attachmentId)}`, {
    method: "DELETE",
    signal,
  });
}

/** Same-origin URL of an attachment's raw bytes (thumbnails, download). */
export function attachmentContentUrl(sessionId: string, attachmentId: string): string {
  return buildUrl(`/api/chat/sessions/${id(sessionId)}/attachments/${id(attachmentId)}/content`);
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
    agent_ids: input.agent_ids?.length ? input.agent_ids : undefined,
    tool_names: input.tool_names?.length ? input.tool_names : undefined,
    attachment_ids: input.attachment_ids?.length ? input.attachment_ids : undefined,
  });

  return apiJson(
    `/api/chat/sessions/${id(sessionId)}/turns`,
    { method: "POST", body: payload, signal, timeoutMs: TIMEOUTS.mutation },
    (value) => parseWith(chatTurnSchema, value, "POST /api/chat/sessions/{id}/turns"),
  );
}

/**
 * POST .../turns/{turnId}/generate — Retry. Re-runs the turn's failed
 * responses (only `responseIds` when given); completed answers are untouched.
 */
export function retryTurnResponses(
  sessionId: string,
  turnId: string,
  responseIds?: string[],
  signal?: AbortSignal,
): Promise<ChatTurn> {
  return apiJson(
    `/api/chat/sessions/${id(sessionId)}/turns/${id(turnId)}/generate`,
    {
      method: "POST",
      body: responseIds ? { response_ids: responseIds } : {},
      signal,
      // LLM + tool calls; matches the BFF route's upstream budget.
      timeoutMs: 185_000,
    },
    (value) => parseWith(chatTurnSchema, value, "POST /api/chat/sessions/{id}/turns/{id}/generate"),
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

export { chatMessageSchema, chatSessionSchema, chatToolSchema, chatTurnSchema, llmResponseSchema };
export type {
  ChatAttachment,
  ChatAttachmentTypes,
  ChatMessage,
  ChatSession,
  ChatSessionModel,
  ChatTool,
  ChatTurn,
  LlmResponse,
  SessionCreate,
  SessionUpdate,
  TurnCreate,
};
