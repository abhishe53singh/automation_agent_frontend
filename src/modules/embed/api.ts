import { z } from "zod";

import { apiJson, apiVoid, definedOnly, parseWith, TIMEOUTS } from "@/shared/lib/api";

import {
  embedConversationSchema,
  embedTranscriptSchema,
  embedWidgetSchema,
  type EmbedConversation,
  type EmbedTranscript,
  type EmbedWidget,
  type EmbedWidgetCreate,
  type EmbedWidgetUpdate,
} from "./schemas";

const widgetListSchema = z.array(embedWidgetSchema);
const conversationListSchema = z.array(embedConversationSchema);
const enc = (v: string) => encodeURIComponent(v);

export const EMBED_CONVERSATIONS_PAGE_SIZE = 20;

export const embedKeys = {
  all: ["embed-widgets"] as const,
  list: (projectId: string) => ["embed-widgets", "list", projectId] as const,
  detail: (id: string) => ["embed-widgets", "detail", id] as const,
  conversations: (id: string, offset = 0) =>
    ["embed-widgets", "detail", id, "conversations", offset] as const,
  conversationsAll: (id: string) => ["embed-widgets", "detail", id, "conversations"] as const,
  transcript: (id: string, sessionId: string) =>
    ["embed-widgets", "detail", id, "transcript", sessionId] as const,
};

export function listEmbedWidgets(projectId: string, signal?: AbortSignal): Promise<EmbedWidget[]> {
  return apiJson("/api/embed-widgets", { signal, query: { project_id: projectId } }, (data) =>
    parseWith(widgetListSchema, data, "GET /api/embed-widgets"),
  );
}

export function getEmbedWidget(id: string, signal?: AbortSignal): Promise<EmbedWidget> {
  return apiJson(`/api/embed-widgets/${enc(id)}`, { signal }, (data) =>
    parseWith(embedWidgetSchema, data, "GET /api/embed-widgets/{id}"),
  );
}

export function createEmbedWidget(
  input: EmbedWidgetCreate,
  signal?: AbortSignal,
): Promise<EmbedWidget> {
  return apiJson(
    "/api/embed-widgets",
    { method: "POST", body: input, signal, timeoutMs: TIMEOUTS.mutation },
    (data) => parseWith(embedWidgetSchema, data, "POST /api/embed-widgets"),
  );
}

export function updateEmbedWidget(
  id: string,
  patch: EmbedWidgetUpdate,
  signal?: AbortSignal,
): Promise<EmbedWidget> {
  return apiJson(
    `/api/embed-widgets/${enc(id)}`,
    { method: "PATCH", body: definedOnly(patch), signal, timeoutMs: TIMEOUTS.mutation },
    (data) => parseWith(embedWidgetSchema, data, "PATCH /api/embed-widgets/{id}"),
  );
}

export function deleteEmbedWidget(id: string, signal?: AbortSignal): Promise<void> {
  return apiVoid(`/api/embed-widgets/${enc(id)}`, { method: "DELETE", signal });
}

export function rotateEmbedWidgetKey(id: string, signal?: AbortSignal): Promise<EmbedWidget> {
  return apiJson(
    `/api/embed-widgets/${enc(id)}/rotate-key`,
    { method: "POST", body: {}, signal, timeoutMs: TIMEOUTS.mutation },
    (data) => parseWith(embedWidgetSchema, data, "POST /api/embed-widgets/{id}/rotate-key"),
  );
}

export function listEmbedConversations(
  id: string,
  { limit = EMBED_CONVERSATIONS_PAGE_SIZE, offset = 0 }: { limit?: number; offset?: number } = {},
  signal?: AbortSignal,
): Promise<EmbedConversation[]> {
  return apiJson(
    `/api/embed-widgets/${enc(id)}/conversations`,
    { signal, query: { limit, offset } },
    (data) => parseWith(conversationListSchema, data, "GET /api/embed-widgets/{id}/conversations"),
  );
}

export function getEmbedTranscript(
  id: string,
  sessionId: string,
  signal?: AbortSignal,
): Promise<EmbedTranscript> {
  return apiJson(
    `/api/embed-widgets/${enc(id)}/conversations/${enc(sessionId)}`,
    { signal },
    (data) =>
      parseWith(embedTranscriptSchema, data, "GET /api/embed-widgets/{id}/conversations/{sid}"),
  );
}
