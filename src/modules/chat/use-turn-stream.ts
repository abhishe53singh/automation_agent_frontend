import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { isMockMode } from "@/config/env";
import { chatKeys, streamTurnUrl } from "./api";
import { mockChat } from "./mock-api";
import { llmResponseSchema, type ChatTurn, type LlmResponse } from "./schemas";
import { ApiError } from "@/shared/lib/api";
import { consumeSse, type SseEvent, type SseSubscription } from "@/shared/lib/sse";

/**
 * SSE lifecycle state for one turn (item 34).
 *
 *   idle        — nothing streaming
 *   connecting  — the request is open but no event has arrived
 *   streaming   — at least one `response` event seen
 *   done        — the terminal `done` event (every response is final)
 *   timeout     — the terminal `timeout` event (the 300 s upstream cap)
 *   error       — the stream failed; the turns query was still invalidated
 */
export type StreamState = "idle" | "connecting" | "streaming" | "done" | "timeout" | "error";

export interface UseTurnStreamResult {
  state: StreamState;
  /** Live response rows received on this stream, keyed by response id. */
  responses: ReadonlyMap<string, LlmResponse>;
  error: ApiError | null;
  /** Stop listening early (the turn keeps running server-side). */
  stop: () => void;
}

const TERMINAL_EVENTS = new Set(["done", "timeout"]);

/**
 * Parse a `response` event payload. Returns null (never throws) when the frame
 * is not valid JSON or does not match the schema, so one bad frame cannot abort
 * a stream that is still delivering good ones.
 */
function parseResponseEvent(data: string): LlmResponse | null {
  let payload: unknown;
  try {
    payload = JSON.parse(data) as unknown;
  } catch {
    return null;
  }
  const result = llmResponseSchema.safeParse(payload);
  return result.success ? result.data : null;
}

/**
 * Merge a `response` event into the turns cache.
 *
 * The event carries the full `LlmResponseResponse`, so the card updates in
 * place without a refetch. Only the matching turn inside the session's top-level
 * turn list is rewritten.
 */
export function applyResponseEvent(turns: unknown, response: LlmResponse): unknown[] | null {
  if (!Array.isArray(turns)) return null;

  let changed = false;
  const next = turns.map((turn) => {
    if (!turn || typeof turn !== "object") return turn;
    const typed = turn as ChatTurn;
    const index = typed.llm_responses.findIndex((row) => row.id === response.id);
    if (index === -1) return turn;

    const responses = [...typed.llm_responses];
    responses[index] = response;
    changed = true;
    return { ...typed, llm_responses: responses };
  });

  return changed ? next : null;
}

/**
 * Subscribe to a turn's SSE stream and fold its events into the query cache.
 *
 * Abort behaviour (item 34): the subscription is torn down on unmount, on
 * `turnId` change, and whenever a terminal event arrives, so the BFF cancels the
 * upstream fetch rather than leaving it polling for the full 300 s cap.
 */
export function useTurnStream(sessionId: string, turnId: string | null): UseTurnStreamResult {
  const queryClient = useQueryClient();
  const [state, setState] = React.useState<StreamState>("idle");
  const [responses, setResponses] = React.useState<Map<string, LlmResponse>>(new Map());
  const [error, setError] = React.useState<ApiError | null>(null);
  const subscriptionRef = React.useRef<SseSubscription | null>(null);

  React.useEffect(() => {
    if (!turnId) return;

    const controller = new AbortController();

    // No setState reset here: a new turn means a new session/turn key upstream,
    // which remounts this component, so `state`/`responses`/`error` already
    // start clean (react-hooks/set-state-in-effect).

    // One handler set, shared by the live SSE client and the fixture emitter.
    const handlers = {
      onKeepAlive: () => {
        // A keep-alive before any `response` event still means we are live.
        setState((current) => (current === "connecting" ? "streaming" : current));
      },

      onEvent: (event: SseEvent) => {
        if (event.event === "response") {
          const response = parseResponseEvent(event.data);
          if (!response) {
            // A malformed frame is a contract break, not a reason to tear the
            // whole stream down: log it and wait for the next event.
            console.error("[chat] unparseable SSE response frame", event.data);
            return;
          }
          setResponses((current) => {
            const next = new Map(current);
            next.set(response.id, response);
            return next;
          });
          setState("streaming");

          // Patch the cached turn in place for an instant card update (item 85, K11).
          queryClient.setQueryData<unknown[]>(
            chatKeys.turns(sessionId),
            (previous) => applyResponseEvent(previous, response) ?? previous,
          );
          // Also patch any branch children queries that might contain this turn
          queryClient.setQueriesData<unknown[]>(
            { queryKey: ["chat", "session", sessionId, "turns"] },
            (previous) => applyResponseEvent(previous, response) ?? previous,
          );
          return;
        }

        if (event.event === "done") {
          setState("done");
          // One reconciliation pass once the round is final, so the turn's
          // summary (costs, latency) matches the server exactly.
          void queryClient.invalidateQueries({ queryKey: chatKeys.session(sessionId) });
          return;
        }

        if (event.event === "timeout") {
          setState("timeout");
          void queryClient.invalidateQueries({ queryKey: chatKeys.session(sessionId) });
          toast.warning("The models took too long. Partial answers are shown.");
        }
      },

      onError: (streamError: ApiError) => {
        setError(streamError);
        setState("error");
        // The turn may still be running server-side; re-read the truth.
        void queryClient.invalidateQueries({ queryKey: chatKeys.session(sessionId) });
      },

      shouldStop: (event: { event: string }) => TERMINAL_EVENTS.has(event.event),
    };

    const subscription = isMockMode()
      ? // Fixture mode (item 37): the same handler contract, a local emitter.
        mockChat.streamTurn(sessionId, turnId, {
          signal: controller.signal,
          onEvent: handlers.onEvent,
          onKeepAlive: handlers.onKeepAlive,
          onError: handlers.onError,
        })
      : consumeSse(streamTurnUrl(sessionId, turnId), { signal: controller.signal, ...handlers });

    subscriptionRef.current = subscription;

    return () => {
      // Unmount / turnId change / session change: abort now.
      subscription.close();
      subscriptionRef.current = null;
    };
  }, [sessionId, turnId, queryClient]);

  const stop = React.useCallback(() => {
    subscriptionRef.current?.close();
  }, []);

  // `state` and the reset are both DERIVED, not pushed in via setState inside
  // the effect (react-hooks/set-state-in-effect). A turn with no event yet is
  // still "connecting"; with no turn at all it is "idle".
  const resolved: StreamState = !turnId
    ? "idle"
    : state === "idle" && responses.size === 0
      ? "connecting"
      : state;

  return { state: resolved, responses, error, stop };
}
