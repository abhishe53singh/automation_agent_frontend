import { ApiError } from "@/shared/lib/api";

import { completeResponse, fixtureStore, mockId, newResponse, FIXTURE_MODELS } from "./fixtures";
import type { ChatMessage, ChatSession, ChatTurn } from "./schemas";
import type { SseEvent, SseSubscription } from "@/shared/lib/sse";

/**
 * The fixture-mode implementation of the chat API
 * (.agent/phase_4.txt item 37).
 *
 * Every function mirrors the shape AND the failure modes of the real client, so
 * a component cannot accidentally depend on mock-only behaviour: an unknown
 * session still throws `error.not_found`, and a round with no enabled model
 * still throws `error.validation`.
 *
 * The stream is simulated with timers and returns the SAME `SseSubscription`
 * the real client does, so `useTurnStream` — including its abort-on-unmount
 * cleanup — is the code under test in both modes.
 */

const LATENCY_MS = 400;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function requireSession(sessionId: string): ChatSession {
  const session = fixtureStore.sessions.get(sessionId);
  if (!session) throw new ApiError("not_found", "Not found.", 404);
  return clone(session);
}

function requireTurns(sessionId: string): ChatTurn[] {
  if (!fixtureStore.sessions.has(sessionId)) {
    throw new ApiError("not_found", "Not found.", 404);
  }
  return clone(fixtureStore.turns.get(sessionId) ?? []);
}

/**
 * A timer-driven stand-in for `consumeSse`. Emits one `response` event per
 * model, staggered, then a terminal `done` — the same frame sequence the BFF
 * proxies. Honours the caller's AbortSignal exactly like the real client.
 */
function mockSse(
  events: () => SseEvent[],
  options: {
    onEvent: (event: SseEvent) => void;
    onClose?: () => void;
    onError?: (error: ApiError) => void;
    signal?: AbortSignal;
  },
): SseSubscription {
  const queue = events();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let settled = false;

  const finish = () => {
    settled = true;
    if (timer) clearTimeout(timer);
    options.onClose?.();
  };

  const onAbort = () => {
    if (settled) return;
    if (timer) clearTimeout(timer);
    settled = true;
    options.onClose?.();
  };
  if (options.signal) {
    if (options.signal.aborted) onAbort();
    else options.signal.addEventListener("abort", onAbort, { once: true });
  }

  const pump = () => {
    if (settled) return;
    const next = queue.shift();
    if (!next) {
      finish();
      return;
    }
    options.onEvent(next);
    timer = setTimeout(pump, LATENCY_MS);
  };
  timer = setTimeout(pump, LATENCY_MS);

  return {
    close: () => {
      if (settled) return;
      if (timer) clearTimeout(timer);
      settled = true;
      options.signal?.removeEventListener("abort", onAbort);
      options.onClose?.();
    },
    done: Promise.resolve(),
  };
}

export const mockChat = {
  async listSessions(options: { includeArchived?: boolean } = {}): Promise<ChatSession[]> {
    const all = [...fixtureStore.sessions.values()].map(clone);
    return options.includeArchived ? all : all.filter((session) => !session.archived_at);
  },

  async getSession(sessionId: string): Promise<ChatSession> {
    return requireSession(sessionId);
  },

  async createSession(input: { title?: string }): Promise<ChatSession> {
    const stamp = new Date().toISOString();
    const session: ChatSession = {
      id: mockId("session"),
      user_id: mockId("user"),
      project_id: null,
      title: input.title?.trim() || null,
      created_at: stamp,
      updated_at: stamp,
      archived_at: null,
      models: [],
    };
    // Attach the active fixture models, as the real registry would.
    session.models = FIXTURE_MODELS.filter((row) => row.is_active).map((row) => ({
      id: mockId("attached"),
      session_id: session.id,
      model_id: row.id,
      is_enabled: true,
      created_at: stamp,
      model: clone(row),
    }));
    fixtureStore.sessions.set(session.id, session);
    fixtureStore.turns.set(session.id, []);
    fixtureStore.messages.set(session.id, []);
    return clone(session);
  },

  async updateSession(
    sessionId: string,
    input: { title?: string | null; is_archived?: boolean },
  ): Promise<ChatSession> {
    const session = requireSession(sessionId);
    if (input.title !== undefined) session.title = input.title?.trim() || null;
    if (input.is_archived !== undefined) {
      session.archived_at = input.is_archived ? new Date().toISOString() : null;
    }
    session.updated_at = new Date().toISOString();
    fixtureStore.sessions.set(sessionId, session);
    return clone(session);
  },

  async deleteSession(sessionId: string): Promise<void> {
    requireSession(sessionId);
    fixtureStore.sessions.delete(sessionId);
    fixtureStore.turns.delete(sessionId);
    fixtureStore.messages.delete(sessionId);
  },

  async setSessionModels(sessionId: string, modelIds: string[]): Promise<ChatSession> {
    const session = requireSession(sessionId);
    const wanted = new Set(modelIds);
    const kept = session.models.filter((row) => wanted.has(row.model_id));

    for (const id of modelIds) {
      if (session.models.some((row) => row.model_id === id)) continue;
      const model = FIXTURE_MODELS.find((row) => row.id === id);
      if (!model) throw new ApiError("validation", "Unknown model id.", 400);
      kept.push({
        id: mockId("attached"),
        session_id: sessionId,
        model_id: id,
        is_enabled: true,
        created_at: new Date().toISOString(),
        model: clone(model),
      });
    }
    session.models = kept;
    fixtureStore.sessions.set(sessionId, session);
    return clone(session);
  },

  async setSessionModelEnabled(
    sessionId: string,
    modelId: string,
    isEnabled: boolean,
  ): Promise<ChatSession["models"][number]> {
    const session = requireSession(sessionId);
    const row = session.models.find((entry) => entry.model_id === modelId);
    if (!row) throw new ApiError("not_found", "Not found.", 404);
    row.is_enabled = isEnabled;
    fixtureStore.sessions.set(sessionId, session);
    return clone(row);
  },

  async createTurn(
    sessionId: string,
    input: { content: string; parent_turn_id?: string; model_ids?: string[] },
  ): Promise<ChatTurn> {
    const session = requireSession(sessionId);
    const override = input.model_ids;
    const targets = override?.length
      ? session.models.filter((row) => override.includes(row.model_id))
      : session.models.filter((row) => row.is_enabled);

    if (targets.length === 0) {
      throw new ApiError("validation", "No enabled models for this round.", 400);
    }

    const stamp = new Date().toISOString();
    const history = fixtureStore.messages.get(sessionId) ?? [];
    const message: ChatMessage = {
      id: mockId("message"),
      session_id: sessionId,
      parent_message_id: null,
      role: "user",
      content: input.content,
      sequence_number: history.length + 1,
      created_at: stamp,
      updated_at: stamp,
    };

    const turn: ChatTurn = {
      id: mockId("turn"),
      session_id: sessionId,
      parent_turn_id: input.parent_turn_id ?? null,
      user_message_id: message.id,
      created_at: stamp,
      user_message: message,
      llm_responses: targets.map((row) =>
        newResponse(row.model as NonNullable<typeof row.model>, message.id),
      ),
    };

    const list = fixtureStore.turns.get(sessionId) ?? [];
    list.push(turn);
    fixtureStore.turns.set(sessionId, list);
    history.push(message);
    fixtureStore.messages.set(sessionId, history);

    return clone(turn);
  },

  async listTurns(sessionId: string, parentTurnId?: string): Promise<ChatTurn[]> {
    const all = requireTurns(sessionId);
    return parentTurnId
      ? all.filter((turn) => turn.parent_turn_id === parentTurnId)
      : all.filter((turn) => !turn.parent_turn_id);
  },

  async listMessages(sessionId: string): Promise<ChatMessage[]> {
    requireTurns(sessionId);
    return clone(fixtureStore.messages.get(sessionId) ?? []);
  },

  /**
   * The simulated round: one `response` event per attached model (each moved to
   * `completed` with realistic metrics), then a terminal `done`.
   */
  streamTurn(
    sessionId: string,
    turnId: string,
    handlers: {
      onEvent: (event: SseEvent) => void;
      onKeepAlive?: () => void;
      onClose?: () => void;
      onError?: (error: ApiError) => void;
      signal?: AbortSignal;
    },
  ): SseSubscription {
    const list = fixtureStore.turns.get(sessionId) ?? [];
    const turn = list.find((entry) => entry.id === turnId);
    if (!turn) throw new ApiError("not_found", "Not found.", 404);

    const completed = turn.llm_responses.map((response) => {
      const model = FIXTURE_MODELS.find((row) => row.id === response.model_id);
      return completeResponse(
        response,
        model ?? FIXTURE_MODELS[0],
        `**Fixture answer** for: “${turn.user_message?.content ?? ""}”`,
      );
    });

    const events: SseEvent[] = [
      ...completed.map((response) => ({ event: "response", data: JSON.stringify(response) })),
      {
        event: "done",
        data: JSON.stringify({
          message_id: turn.user_message_id,
          responses: completed.length,
        }),
      },
    ];

    return mockSse(() => events, handlers);
  },
};
