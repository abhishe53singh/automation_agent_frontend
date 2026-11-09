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
 *   streaming   — events are arriving (rows and/or live tokens)
 *   done        — the terminal `done` event (every response is final)
 *   timeout     — the terminal `timeout` event: upstream saw NOTHING generating
 *                 for 5 minutes (a stuck row). A long answer never times out.
 *   error       — the stream failed; the turns query was still invalidated
 *
 * Token streaming: while a model writes, upstream sends `delta` events
 * `{ response_id, text, replace, note }`. `replace` means "start this answer
 * over from `text`" (a tool round began, so the preamble is discarded); `note`
 * is an activity line such as "Using web_search…". The final `response` event
 * carries the stored answer and always wins over the streamed text.
 */
export type StreamState = "idle" | "connecting" | "streaming" | "done" | "timeout" | "error";

export interface UseTurnStreamResult {
  state: StreamState;
  /** Live response rows received on this stream, keyed by response id. */
  responses: ReadonlyMap<string, LlmResponse>;
  /** Current activity line per response id ("Using web_search…"), if any. */
  notes: ReadonlyMap<string, string>;
  error: ApiError | null;
  /** Stop listening early (the turn keeps running server-side). */
  stop: () => void;
}

const TERMINAL_EVENTS = new Set(["done", "timeout"]);

interface DeltaEvent {
  response_id: string;
  text: string;
  replace: boolean;
  note: string | null;
}

function parseDeltaEvent(data: string): DeltaEvent | null {
  try {
    const value = JSON.parse(data) as Partial<DeltaEvent>;
    if (typeof value.response_id !== "string" || typeof value.text !== "string") return null;
    return {
      response_id: value.response_id,
      text: value.text,
      replace: value.replace === true,
      note: typeof value.note === "string" ? value.note : null,
    };
  } catch {
    return null;
  }
}

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
export function useTurnStream(
  sessionId: string,
  turnId: string | null,
  /** Bump to re-open the stream for the SAME turn (e.g. after Retry). */
  attempt = 0,
): UseTurnStreamResult {
  const queryClient = useQueryClient();
  const [state, setState] = React.useState<StreamState>("idle");
  const [responses, setResponses] = React.useState<Map<string, LlmResponse>>(new Map());
  const [notes, setNotes] = React.useState<Map<string, string>>(new Map());
  const [error, setError] = React.useState<ApiError | null>(null);
  const subscriptionRef = React.useRef<SseSubscription | null>(null);

  // A new stream starts from a clean slate. Resetting during render (React's
  // "derived state" pattern) avoids a stale `done` from the PREVIOUS turn
  // leaking into the next one.
  const streamKey = turnId ? `${turnId}:${attempt}` : null;
  const [trackedKey, setTrackedKey] = React.useState(streamKey);
  if (trackedKey !== streamKey) {
    setTrackedKey(streamKey);
    setState("idle");
    setResponses(new Map());
    setNotes(new Map());
    setError(null);
  }

  React.useEffect(() => {
    if (!turnId) return;

    const controller = new AbortController();

    // No setState reset here: the render-time `streamKey` check above already
    // cleared state for this turn (react-hooks/set-state-in-effect).

    // One handler set, shared by the live SSE client and the fixture emitter.
    const handlers = {
      onKeepAlive: () => {
        // A keep-alive before any `response` event still means we are live.
        setState((current) => (current === "connecting" ? "streaming" : current));
      },

      onEvent: (event: SseEvent) => {
        if (event.event === "delta") {
          const delta = parseDeltaEvent(event.data);
          if (!delta) return;
          setState("streaming");
          setResponses((current) => {
            const base = current.get(delta.response_id);
            // Rows arrive before deltas; without one there is nothing to patch.
            if (!base || base.status !== "pending") return current;
            const next = new Map(current);
            next.set(delta.response_id, {
              ...base,
              content: delta.replace ? delta.text : (base.content ?? "") + delta.text,
            });
            return next;
          });
          setNotes((current) => {
            const had = current.get(delta.response_id);
            if ((had ?? null) === delta.note) return current;
            const next = new Map(current);
            if (delta.note) next.set(delta.response_id, delta.note);
            else next.delete(delta.response_id);
            return next;
          });
          return;
        }

        if (event.event === "response") {
          const response = parseResponseEvent(event.data);
          if (!response) {
            // A malformed frame is a contract break, not a reason to tear the
            // whole stream down: log it and wait for the next event.
            console.error("[chat] unparseable SSE response frame", event.data);
            return;
          }
          setResponses((current) => {
            const previous = current.get(response.id);
            const next = new Map(current);
            // A still-pending row carries no content yet; keep streamed text.
            next.set(
              response.id,
              response.status === "pending" && previous?.content
                ? { ...response, content: previous.content }
                : response,
            );
            return next;
          });
          if (response.status !== "pending") {
            setNotes((current) => {
              if (!current.has(response.id)) return current;
              const next = new Map(current);
              next.delete(response.id);
              return next;
            });
          }
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
          toast.warning("Nothing is generating this answer any more. Reload the chat to check on it.");
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
  }, [sessionId, turnId, attempt, queryClient]);

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

  return { state: resolved, responses, notes, error, stop };
}
