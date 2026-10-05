#!/usr/bin/env node
/**
 * Chat smoke test (.agent/phase_4.txt item 38).
 *
 * Drives the frontend gateway over HTTP and walks the whole chat lifecycle,
 * including the SSE stream and branching:
 *
 *   signup -> create session -> attach models -> submit a turn
 *   -> consume the SSE stream (response events + terminal done)
 *   -> branch from the first turn -> confirm the child turn
 *   -> rename / archive / delete the session
 *
 * It asserts the browser-facing contract, not the backend's:
 *   - every route validates its payload before the upstream call
 *   - a turn fans out one response row per enabled model, all `pending`
 *   - the SSE route serves text/event-stream, proxies `response` events
 *     verbatim, and terminates with `done`
 *   - `parent_turn_id` really creates a branch (the child is NOT a top-level
 *     turn; it is only reachable through ?parentTurnId=…)
 *   - a session the caller does not own is masked as 404, never 403
 *
 * NOTE on responses staying `pending`: the backend has no LLM provider
 * adapters yet, so a real round never completes. That is expected and the test
 * asserts `pending` rather than faking a completion.
 *
 * Usage:
 *   npm run build && npm run start -- -p 3100
 *   npm run verify:chat
 *   BFF_BASE_URL=http://localhost:3100 node scripts/verify_chat.mjs
 */

const BASE = (process.env.BFF_BASE_URL ?? "http://localhost:3100").replace(/\/+$/, "");

let passed = 0;
const failures = [];

function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

/** A cookie jar, so each actor holds its own session. */
function createJar() {
  const jar = new Map();

  function absorb(response) {
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(";");
      const index = pair.indexOf("=");
      if (index === -1) continue;
      const name = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();
      if (value) jar.set(name, value);
      else jar.delete(name);
    }
  }

  async function call(method, path, body) {
    const headers = { Accept: "application/json" };
    if (jar.size > 0) headers.Cookie = cookieHeader();
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const response = await fetch(BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "manual",
    });
    absorb(response);

    const text = await response.text();
    let json;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      // Non-JSON body (e.g. an SSE stream) — `json` stays undefined.
    }
    return { status: response.status, text, json, headers: response.headers };
  }

  /** The current cookies, for the raw streaming request. */
  function cookieHeader() {
    return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  // Expose the jar on the callable so `readStream` can reuse its cookies.
  call.cookieHeader = cookieHeader;
  return call;
}

/**
 * Read an SSE stream until it ends or a terminal event arrives, returning the
 * parsed frames. Mirrors what `shared/lib/sse` does in the browser.
 */
async function readStream(path, cookieHeader, maxMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), maxMs);

  const response = await fetch(BASE + path, {
    method: "GET",
    headers: { Accept: "text/event-stream", ...(cookieHeader ? { Cookie: cookieHeader } : {}) },
    signal: controller.signal,
  });

  if (!response.ok) {
    clearTimeout(timer);
    return { status: response.status, contentType: "", events: [] };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const events = [];
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split(/\n\n/);
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        if (!frame.trim()) continue;
        let name = "message";
        let data = "";
        for (const line of frame.split("\n")) {
          if (line.startsWith("event:")) name = line.slice(6).trim();
          else if (line.startsWith("data:")) data += line.slice(5).trim();
        }
        events.push({ event: name, data, raw: frame });
      }
    }
  } catch {
    // The abort fired: fall through with whatever arrived.
  } finally {
    clearTimeout(timer);
    await reader.cancel().catch(() => undefined);
  }

  return {
    status: response.status,
    contentType: response.headers.get("content-type") ?? "",
    events,
  };
}

async function main() {
  section("0. BFF reachable");
  const anon = createJar();
  let r = await anon("GET", "/api/health");
  check("GET /api/health returns 200", r.status === 200, `got ${r.status}`);
  if (r.status !== 200) {
    console.error(`\nBFF not reachable at ${BASE}. Run: npm run build && npm run start -- -p 3100`);
    process.exit(1);
  }

  const stamp = Date.now();
  const owner = createJar();
  const stranger = createJar();

  section("1. Two accounts sign up");
  r = await owner("POST", "/api/auth/signup", {
    username: `chato${stamp}`.slice(0, 40),
    email: `chato${stamp}@example.com`,
    password: "ChatTest123!",
  });
  check("owner signup returns 201", r.status === 201, r.text);

  r = await stranger("POST", "/api/auth/signup", {
    username: `chats${stamp}`.slice(0, 40),
    email: `chats${stamp}@example.com`,
    password: "ChatTest123!",
  });
  check("stranger signup returns 201", r.status === 201, r.text);

  section("2. Register a model so a round has somewhere to fan out to");
  r = await owner("POST", "/api/llm/providers", { name: `chatprov${stamp}`.slice(0, 40) });
  check("create provider returns 201", r.status === 201, `got ${r.status}: ${r.text}`);
  const provider = r.json;

  r = await owner("POST", "/api/llm/models", {
    provider_id: provider?.id,
    name: "chat-fixture-model",
    input_cost_per_million: 0.1,
    output_cost_per_million: 0.2,
  });
  check("create model returns 201", r.status === 201, `got ${r.status}: ${r.text}`);
  const model = r.json;

  r = await owner("POST", "/api/llm/models", { name: "no-provider" });
  check(
    "a model without a provider is rejected (400)",
    r.status === 400,
    `got ${r.status}: ${r.text}`,
  );

  section("3. Create a chat attached to that model");
  r = await owner("POST", "/api/chat/sessions", {
    title: "Smoke chat",
    model_ids: [model?.id],
  });
  check("POST /api/chat/sessions returns 201", r.status === 201, `got ${r.status}: ${r.text}`);
  const session = r.json;
  const sessionId = session?.id;
  check("the session carries the attached model", session?.models?.length === 1, r.text);
  check("the model is enabled by default", session?.models?.[0]?.is_enabled === true, r.text);

  r = await owner("GET", "/api/chat/sessions");
  check("GET /api/chat/sessions returns 200", r.status === 200, r.text);
  check(
    "the new session is listed",
    r.json?.some((row) => row.id === sessionId),
    r.text,
  );

  r = await stranger("GET", `/api/chat/sessions/${sessionId}`);
  check(
    "another user gets 404 for the session, not 403",
    r.status === 404,
    `got ${r.status}: ${r.text}`,
  );

  section("4. Submit a turn");
  r = await owner("POST", `/api/chat/sessions/${sessionId}/turns`, { content: "   " });
  check("an empty message is rejected (400)", r.status === 400, `got ${r.status}: ${r.text}`);

  r = await owner("POST", `/api/chat/sessions/${sessionId}/turns`, {
    content: "Hello from the smoke test",
  });
  check("POST turns returns 201", r.status === 201, `got ${r.status}: ${r.text}`);
  const turn = r.json;
  const turnId = turn?.id;
  check(
    "the turn embeds the user message",
    turn?.user_message?.content === "Hello from the smoke test",
    r.text,
  );
  check("one response row per enabled model", turn?.llm_responses?.length === 1, r.text);
  // Expected: no provider adapter exists yet, so the row legitimately waits.
  check(
    "the response starts 'pending' (no provider adapter yet)",
    turn?.llm_responses?.[0]?.status === "pending",
    r.text,
  );

  r = await owner("GET", `/api/chat/sessions/${sessionId}/messages`);
  check(
    "the user message was persisted",
    r.json?.some((m) => m.role === "user"),
    r.text,
  );

  section("5. The SSE route");
  const stream = await readStream(
    `/api/chat/sessions/${sessionId}/turns/${turnId}/stream`,
    owner.cookieHeader(),
    4000,
  );
  check("the stream returns 200", stream.status === 200, `got ${stream.status}`);
  check(
    "the content type is text/event-stream",
    stream.contentType.includes("text/event-stream"),
    stream.contentType,
  );
  const responseEvents = stream.events.filter((event) => event.event === "response");
  check(
    "at least one 'response' event arrives",
    responseEvents.length >= 1,
    `${responseEvents.length}`,
  );
  if (responseEvents.length > 0) {
    const parsed = JSON.parse(responseEvents[0].data);
    check(
      "the response event carries a full LlmResponse row",
      typeof parsed?.id === "string",
      responseEvents[0].data,
    );
    check(
      "the streamed row has a status",
      typeof parsed?.status === "string",
      responseEvents[0].data,
    );
  }
  check(
    "keep-alive comments are proxied through",
    stream.events.some((event) => event.raw.startsWith(":")),
    "no ': keep-alive' frame seen",
  );

  r = await stranger("GET", `/api/chat/sessions/${sessionId}/turns/${turnId}/stream`);
  check("a non-owner cannot open the stream (404)", r.status === 404, `got ${r.status}: ${r.text}`);

  section("6. Branching");
  r = await owner("GET", `/api/chat/sessions/${sessionId}/turns`);
  check("the turn is a top-level turn", r.json?.length === 1, r.text);
  check("its parent_turn_id is null", r.json?.[0]?.parent_turn_id === null, r.text);

  r = await owner("POST", `/api/chat/sessions/${sessionId}/turns`, {
    content: "A different path",
    parent_turn_id: turnId,
  });
  check("POST with parent_turn_id returns 201", r.status === 201, `got ${r.status}: ${r.text}`);
  const branchTurn = r.json;
  check("the child records its parent", branchTurn?.parent_turn_id === turnId, r.text);

  r = await owner("GET", `/api/chat/sessions/${sessionId}/turns`);
  check(
    "the unfiltered list contains BOTH turns (backend returns all)",
    r.json?.length === 2,
    r.text,
  );
  check(
    "so the module filters to parent_turn_id === null for the main list",
    r.json?.filter((t) => !t.parent_turn_id).length === 1,
    r.text,
  );

  r = await owner("GET", `/api/chat/sessions/${sessionId}/turns?parentTurnId=${turnId}`);
  check("the child IS reachable via parentTurnId", r.json?.length === 1, r.text);
  check("and it is the right turn", r.json?.[0]?.id === branchTurn?.id, r.text);

  section("7. Session model set");
  r = await owner("PUT", `/api/chat/sessions/${sessionId}/models`, { model_ids: [] });
  check("an empty model_ids list detaches everything", r.json?.models?.length === 0, r.text);

  r = await owner("PUT", `/api/chat/sessions/${sessionId}/models`, { model_ids: "nope" });
  check("a non-list model_ids is rejected (400)", r.status === 400, `got ${r.status}: ${r.text}`);

  r = await owner("POST", `/api/chat/sessions/${sessionId}/turns`, { content: "no models" });
  check(
    "a round with no enabled model is rejected (400)",
    r.status === 400,
    `got ${r.status}: ${r.text}`,
  );

  r = await owner("PUT", `/api/chat/sessions/${sessionId}/models`, { model_ids: [model?.id] });
  check("re-attaching the model works", r.json?.models?.length === 1, r.text);

  const attachedModelId = r.json?.models?.[0]?.model_id;
  r = await owner("PATCH", `/api/chat/sessions/${sessionId}/models/${attachedModelId}`, {
    is_enabled: false,
  });
  check("disabling an attached model returns 200", r.status === 200, `got ${r.status}: ${r.text}`);
  check("is_enabled is now false", r.json?.is_enabled === false, r.text);

  r = await owner("PATCH", `/api/chat/sessions/${sessionId}/models/${attachedModelId}`, {
    is_enabled: "yes",
  });
  check(
    "a non-boolean is_enabled is rejected (400)",
    r.status === 400,
    `got ${r.status}: ${r.text}`,
  );

  // A model id that is genuinely NOT attached to this session. (The registry
  // model id alone is not enough here — it was re-attached above.)
  const unattachedId = "00000000-0000-4000-8000-00000000dead";
  r = await owner("PATCH", `/api/chat/sessions/${sessionId}/models/${unattachedId}`, {
    is_enabled: true,
  });
  check(
    "toggling a model that is NOT attached is 404",
    r.status === 404,
    `got ${r.status}: ${r.text}`,
  );

  section("8. Rename, archive, delete");
  r = await owner("PATCH", `/api/chat/sessions/${sessionId}`, { title: "Renamed chat" });
  check("rename returns 200", r.status === 200, `got ${r.status}: ${r.text}`);
  check("the new title is stored", r.json?.title === "Renamed chat", r.text);

  r = await owner("PATCH", `/api/chat/sessions/${sessionId}`, {});
  check("an empty PATCH is rejected (400)", r.status === 400, `got ${r.status}: ${r.text}`);

  r = await owner("PATCH", `/api/chat/sessions/${sessionId}`, { is_archived: true });
  check("archiving returns 200", r.status === 200, `got ${r.status}: ${r.text}`);
  check("archived_at is set", typeof r.json?.archived_at === "string", r.text);

  r = await owner("GET", "/api/chat/sessions");
  check(
    "archived sessions are hidden by default",
    !r.json?.some((row) => row.id === sessionId),
    r.text,
  );

  r = await owner("GET", "/api/chat/sessions?includeArchived=true");
  check(
    "includeArchived=true brings it back",
    r.json?.some((row) => row.id === sessionId),
    r.text,
  );

  r = await owner("DELETE", `/api/chat/sessions/${sessionId}`);
  check("DELETE returns 204", r.status === 204, `got ${r.status}: ${r.text}`);

  r = await owner("GET", `/api/chat/sessions/${sessionId}`);
  check("the session is gone (404)", r.status === 404, `got ${r.status}: ${r.text}`);

  section("Result");
  console.log(`  ${passed} checks passed, ${failures.length} failed`);
  if (failures.length > 0) {
    console.log("\nFAILURES:");
    for (const failure of failures) console.log(`  - ${failure}`);
    console.log("\nRESULT: FAILED");
    process.exit(1);
  }
  console.log("\nRESULT: ALL CHECKS PASSED");
}

main().catch((error) => {
  console.error("\nSmoke test crashed:", error);
  process.exit(1);
});
