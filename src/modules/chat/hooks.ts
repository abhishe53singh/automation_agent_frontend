"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { isMockMode } from "@/config/env";
import { isApiError } from "@/shared/lib/api";

import { mockChat } from "./mock-api";

import {
  chatKeys,
  createSession,
  createTurn,
  deleteSession,
  getSession,
  listMessages,
  listSessions,
  listTurns,
  setSessionModelEnabled,
  setSessionModels,
  updateSession,
} from "./api";
import type { SessionCreate, SessionUpdate, TurnCreate } from "./schemas";

/**
 * Chat module hooks (.agent/phase_4.txt items 30, 34, 35).
 *
 * The invalidation map mirrors the projects module (phase 3 item 21):
 *
 *   create session   -> ["chat","sessions"]     (the sidebar list)
 *   rename / archive -> ["chat","sessions",id]  (prefix: also its turns)
 *   delete session   -> drop [.., id], invalidate the list
 *   set model set    -> ["chat","sessions",id]  (the picker re-reads it)
 *   toggle a model   -> ["chat","sessions",id]
 *   submit a turn    -> ["chat","sessions",id]  (turns + messages + session)
 *   stream event     -> ["chat","sessions",id]  (see useTurnStream)
 */

function messageFor(error: unknown, fallback: string): string {
  return isApiError(error) ? error.message : fallback;
}

/** Central invalidation map, mirroring `invalidateProjects`. */
export function invalidateChat(
  queryClient: QueryClient,
  scope: "list" | "session",
  sessionId?: string,
): void {
  if (scope === "list") {
    void queryClient.invalidateQueries({ queryKey: chatKeys.sessions() });
    return;
  }
  if (!sessionId) return;
  // Prefix match: refreshes the session, its turns and its messages.
  void queryClient.invalidateQueries({ queryKey: chatKeys.session(sessionId) });
}

/** GET /api/chat/sessions — the sidebar list (fixtures in mock mode, item 37). */
export function useSessions(options: { includeArchived?: boolean } = {}) {
  return useQuery({
    queryKey: [...chatKeys.sessions(), options.includeArchived ? "all" : "active"],
    queryFn: ({ signal }) =>
      isMockMode()
        ? mockChat.listSessions({ includeArchived: options.includeArchived })
        : listSessions({ includeArchived: options.includeArchived }, signal),
    staleTime: 30_000,
  });
}

/** GET /api/chat/sessions/{id} */
export function useSession(sessionId: string | null | undefined) {
  return useQuery({
    queryKey: chatKeys.session(sessionId ?? ""),
    queryFn: ({ signal }) =>
      isMockMode()
        ? mockChat.getSession(sessionId as string)
        : getSession(sessionId as string, signal),
    enabled: Boolean(sessionId),
    staleTime: 30_000,
  });
}

/** GET /api/chat/sessions/{id}/turns — the conversation's top-level turns. */
export function useTurns(sessionId: string | null | undefined) {
  return useQuery({
    queryKey: chatKeys.turns(sessionId ?? ""),
    // The backend returns EVERY turn when no `parent_turn_id` is given, not
    // just the top-level ones as its docs imply. Filter here so a branch child
    // is not rendered twice — once in the main list and once nested under its
    // parent. Children are fetched separately via `useBranchChildren`.
    queryFn: async ({ signal }) => {
      if (isMockMode()) {
        const turns = await mockChat.listTurns(sessionId as string);
        return turns.filter((turn) => !turn.parent_turn_id);
      }
      const turns = await listTurns(sessionId as string, undefined, signal);
      return turns.filter((turn) => !turn.parent_turn_id);
    },
    enabled: Boolean(sessionId),
    staleTime: 10_000,
  });
}

/** GET /api/chat/sessions/{id}/turns?parentTurnId — a branch's children. */
export function useBranchChildren(sessionId: string | null | undefined, turnId: string | null) {
  return useQuery({
    queryKey: chatKeys.turnChildren(sessionId ?? "", turnId ?? ""),
    queryFn: ({ signal }) =>
      isMockMode()
        ? mockChat.listTurns(sessionId as string, turnId as string)
        : listTurns(sessionId as string, turnId as string, signal),
    enabled: Boolean(sessionId) && Boolean(turnId),
    staleTime: 10_000,
  });
}

/** GET /api/chat/sessions/{id}/messages — the flat history. */
export function useMessages(sessionId: string | null | undefined) {
  return useQuery({
    queryKey: chatKeys.messages(sessionId ?? ""),
    queryFn: ({ signal }) =>
      isMockMode()
        ? mockChat.listMessages(sessionId as string)
        : listMessages(sessionId as string, signal),
    enabled: Boolean(sessionId),
    staleTime: 10_000,
  });
}

/** POST /api/chat/sessions */
export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SessionCreate) =>
      isMockMode() ? mockChat.createSession(input) : createSession(input),
    onSuccess: (session) => {
      invalidateChat(queryClient, "list");
      queryClient.setQueryData(chatKeys.session(session.id), session);
      toast.success("Chat created.");
    },
    onError: (error) => toast.error(messageFor(error, "Could not create the chat.")),
  });
}

/** PATCH /api/chat/sessions/{id} — rename and/or archive. */
export function useUpdateSession(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SessionUpdate) =>
      isMockMode() ? mockChat.updateSession(sessionId, input) : updateSession(sessionId, input),
    onSuccess: (updated) => {
      queryClient.setQueryData(chatKeys.session(sessionId), updated);
      invalidateChat(queryClient, "list");
    },
    onError: (error) => toast.error(messageFor(error, "Could not update the chat.")),
  });
}

/** DELETE /api/chat/sessions/{id} — turns/messages/responses cascade. */
export function useDeleteSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      isMockMode() ? mockChat.deleteSession(sessionId) : deleteSession(sessionId),
    onSuccess: (_result, sessionId) => {
      queryClient.removeQueries({ queryKey: chatKeys.session(sessionId) });
      invalidateChat(queryClient, "list");
      toast.success("Chat deleted.");
    },
    onError: (error) => toast.error(messageFor(error, "Could not delete the chat.")),
  });
}

/** PUT .../models — declarative replace of the session's whole model set. */
export function useSetSessionModels(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (modelIds: string[]) =>
      isMockMode()
        ? mockChat.setSessionModels(sessionId, modelIds)
        : setSessionModels(sessionId, modelIds),
    onSuccess: (updated) => {
      queryClient.setQueryData(chatKeys.session(sessionId), updated);
      invalidateChat(queryClient, "list");
    },
    onError: (error) => toast.error(messageFor(error, "Could not update the model set.")),
  });
}

/** PATCH .../models/{modelId} — enable/disable one attached model. */
export function useToggleSessionModel(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ modelId, enabled }: { modelId: string; enabled: boolean }) =>
      isMockMode()
        ? mockChat.setSessionModelEnabled(sessionId, modelId, enabled)
        : setSessionModelEnabled(sessionId, modelId, enabled),
    onSuccess: () => invalidateChat(queryClient, "session", sessionId),
    onError: (error) => toast.error(messageFor(error, "Could not change that model.")),
  });
}

/**
 * POST .../turns — one round. `parent_turn_id` makes it a branch (item 33).
 *
 * The turn is written into the turns cache IMMEDIATELY so the conversation
 * shows the user's message and its pending response cards before the SSE stream
 * has delivered its first event.
 */
export function useSubmitTurn(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TurnCreate) =>
      isMockMode() ? mockChat.createTurn(sessionId, input) : createTurn(sessionId, input),
    onSuccess: (turn) => {
      queryClient.setQueryData<unknown[]>(chatKeys.turns(sessionId), (previous) => {
        const list = Array.isArray(previous) ? previous : [];
        // A branched turn is a child of another turn, not a new top-level one.
        if (turn.parent_turn_id) return list;
        return [...list, turn];
      });
      invalidateChat(queryClient, "list");
    },
    onError: (error) => toast.error(messageFor(error, "Could not send the message.")),
  });
}
