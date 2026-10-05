import type { LlmModel } from "@/modules/llm/schemas";
import type { ChatMessage, ChatSession, ChatTurn, LlmResponse } from "./schemas";

/**
 * In-memory fixtures for chat + the LLM registry
 * (.agent/phase_4.txt item 37).
 *
 * WHY THIS EXISTS: the backend has no LLM provider adapters yet, so a real turn
 * leaves every `llm_response` at `pending` forever. That is correct behaviour
 * but makes the interesting UI (pending → completed, per-model fan-out,
 * branching, metrics) impossible to develop or review against a live server.
 * With `NEXT_PUBLIC_MOCK=1` the modules answer from this store instead, and the
 * stream is simulated locally.
 *
 * This store NEVER runs in a normal build: every entry point is guarded by
 * `isMockMode()`, and the flag is off unless the env var is set.
 */

const now = () => new Date().toISOString();

/**
 * Deterministic uuid-shaped ids, so React keys stay stable across renders.
 * The `kind` is mixed into the sequence only to keep the ids distinguishable
 * when reading fixture output; the value itself is a plain incrementing tail.
 */
let counter = 0;
export function mockId(kind = "fixture"): string {
  void kind;
  counter += 1;
  const tail = String(counter).padStart(12, "0");
  return `00000000-0000-4000-8000-${tail}`;
}

function model(
  name: string,
  displayName: string,
  inputCost: number,
  outputCost: number,
  contextWindow: number,
): LlmModel {
  return {
    id: mockId("model"),
    provider_id: mockId("provider"),
    name,
    display_name: displayName,
    input_cost_per_million: inputCost,
    output_cost_per_million: outputCost,
    context_window: contextWindow,
    max_output_tokens: 4096,
    is_active: true,
    created_at: now(),
    updated_at: now(),
  };
}

/** The registry the fixture chat is attached to. */
export const FIXTURE_MODELS: LlmModel[] = [
  model("fixture-fast", "Fixture Fast", 0.15, 0.6, 128000),
  model("fixture-deep", "Fixture Deep", 3, 15, 200000),
  model("fixture-off", "Fixture Inactive", 1, 2, 8000),
];
FIXTURE_MODELS[2].is_active = false;

const FAST = FIXTURE_MODELS[0];
const DEEP = FIXTURE_MODELS[1];

function sessionModel(modelRow: LlmModel, isEnabled: boolean) {
  return {
    id: mockId("attached"),
    session_id: "",
    model_id: modelRow.id,
    is_enabled: isEnabled,
    created_at: now(),
    model: modelRow,
  };
}

function answer(text: string): string {
  return [
    text,
    "",
    "```python",
    "# fixture answer — proves the markdown + highlighter path",
    "def greet(name: str) -> str:",
    '    return f"hello {name}"',
    "```",
  ].join("\n");
}

const sessions = new Map<string, ChatSession>();
const turns = new Map<string, ChatTurn[]>();
const messages = new Map<string, ChatMessage[]>();

/** Reset the store to its seeded state. */
export function resetFixtures(): void {
  counter = 0;
  sessions.clear();
  turns.clear();
  messages.clear();

  const session: ChatSession = {
    id: mockId("session"),
    user_id: mockId("user"),
    project_id: null,
    title: "Fixture chat",
    created_at: now(),
    updated_at: now(),
    archived_at: null,
    models: [],
  };
  session.models = [sessionModel(FAST, true), sessionModel(DEEP, true)].map((attached) => ({
    ...attached,
    session_id: session.id,
  }));

  sessions.set(session.id, session);
  turns.set(session.id, []);
  messages.set(session.id, []);
}

/** A fresh `pending` response row, as the backend creates it for a round. */
export function newResponse(modelRow: LlmModel, messageId: string): LlmResponse {
  return {
    id: mockId("response"),
    message_id: messageId,
    model_id: modelRow.id,
    content: null,
    status: "pending",
    input_tokens: null,
    output_tokens: null,
    total_tokens: null,
    input_cost: null,
    output_cost: null,
    total_cost: null,
    latency_ms: null,
    finish_reason: null,
    error_message: null,
    created_at: now(),
    completed_at: null,
  };
}

/**
 * Complete a pending row the way a provider adapter would, so the completed
 * card, the metrics badges and the cost figures are all exercised.
 */
export function completeResponse(
  response: LlmResponse,
  modelRow: LlmModel,
  text: string,
): LlmResponse {
  const inputTokens = 120;
  const outputTokens = 340;
  return {
    ...response,
    content: text,
    status: "completed",
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: inputTokens + outputTokens,
    input_cost: Number(((inputTokens / 1_000_000) * modelRow.input_cost_per_million).toFixed(6)),
    output_cost: Number(((outputTokens / 1_000_000) * modelRow.output_cost_per_million).toFixed(6)),
    total_cost: Number(
      (
        (inputTokens / 1_000_000) * modelRow.input_cost_per_million +
        (outputTokens / 1_000_000) * modelRow.output_cost_per_million
      ).toFixed(6),
    ),
    latency_ms: 820,
    finish_reason: "stop",
    completed_at: now(),
  };
}

export const fixtureStore = {
  sessions,
  turns,
  messages,
  models: FIXTURE_MODELS,
  answer,
  resetFixtures,
};

resetFixtures();
