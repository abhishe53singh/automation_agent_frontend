import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * Unified chat endpoint — POST /llm/chat/completions.
 *
 * Two addressing modes (both valid):
 *  - stored: `provider_id` / `model_id` — the backend resolves the API key
 *    from the DB. `provider` and `model` are still REQUIRED by the schema and
 *    are forwarded verbatim alongside the IDs.
 *  - ad-hoc: `provider` + `model` names with an optional `api_key`/`base_url`
 *    override.
 *
 * The body is validated for shape only and then proxied upstream; the browser
 * never sees a stored key (responses carry `content` + usage metadata only).
 */

const ROLES = new Set(["system", "user", "assistant"]);

const OPTIONAL_STRING_FIELDS = ["provider_id", "model_id", "api_key", "base_url"] as const;
const OPTIONAL_NUMBER_FIELDS = ["temperature", "top_p"] as const;

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw badRequest(`\`${field}\` is required.`);
  return value.trim();
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const record = (body ?? {}) as Record<string, unknown>;

    const provider = requireString(record.provider, "provider");
    const model = requireString(record.model, "model");

    const rawMessages = record.messages;
    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      throw badRequest("`messages` must be a non-empty array.");
    }
    const messages = rawMessages.map((entry, index) => {
      const message = (entry ?? {}) as Record<string, unknown>;
      if (typeof message.role !== "string" || !ROLES.has(message.role)) {
        throw badRequest(`\`messages[${index}].role\` must be system, user or assistant.`);
      }
      if (typeof message.content !== "string") {
        throw badRequest(`\`messages[${index}].content\` must be a string.`);
      }
      return { role: message.role, content: message.content };
    });

    const payload: Record<string, unknown> = { provider, model, messages };

    for (const field of OPTIONAL_STRING_FIELDS) {
      const value = record[field];
      if (value === undefined || value === null) continue;
      if (typeof value !== "string") throw badRequest(`\`${field}\` must be a string.`);
      if (value.trim()) payload[field] = value.trim();
    }

    for (const field of OPTIONAL_NUMBER_FIELDS) {
      const value = record[field];
      if (value === undefined || value === null) continue;
      const parsed = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(parsed)) throw badRequest(`\`${field}\` must be a number.`);
      payload[field] = parsed;
    }

    if (record.max_tokens !== undefined && record.max_tokens !== null) {
      const parsed =
        typeof record.max_tokens === "number" ? record.max_tokens : Number(record.max_tokens);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw badRequest("`max_tokens` must be a positive whole number.");
      }
      payload.max_tokens = parsed;
    }

    if (Array.isArray(record.stop)) {
      if (!record.stop.every((entry) => typeof entry === "string")) {
        throw badRequest("`stop` must be an array of strings.");
      }
      payload.stop = record.stop;
    } else if (record.stop !== undefined && record.stop !== null) {
      throw badRequest("`stop` must be an array of strings or null.");
    }

    const { data } = await callUpstream<unknown>({
      path: "/llm/chat/completions",
      method: "POST",
      body: payload,
      // LLM round-trips legitimately outlive the default upstream budget.
      timeoutMs: 60_000,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
