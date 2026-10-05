import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * One model response (.agent/API.md #40-#41, upstream #40-#41).
 *
 * PATCH is the provider-adapter write path (record/correct a fan-out result);
 * the UI uses it far more rarely — mainly to retry or annotate a failed row.
 * Every field is optional and only the sent ones change.
 */

const STATUSES = ["pending", "completed", "failed"] as const;
const TOKEN_FIELDS = ["input_tokens", "output_tokens", "total_tokens", "latency_ms"] as const;
const COST_FIELDS = ["input_cost", "output_cost", "total_cost"] as const;
const TEXT_FIELDS = ["content", "finish_reason", "error_message"] as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string; responseId: string }> },
): Promise<NextResponse> {
  try {
    const { sessionId, responseId } = await params;
    if (!sessionId || !responseId) throw badRequest("A session id and response id are required.");

    const { data } = await callUpstream<unknown>({
      path: `/chat/sessions/${encodeURIComponent(sessionId)}/responses/${encodeURIComponent(responseId)}`,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string; responseId: string }> },
): Promise<NextResponse> {
  try {
    const { sessionId, responseId } = await params;
    if (!sessionId || !responseId) throw badRequest("A session id and response id are required.");

    const body: unknown = await request.json();
    const record = (body ?? {}) as Record<string, unknown>;
    const payload: Record<string, unknown> = {};

    for (const field of TEXT_FIELDS) {
      const value = record[field];
      if (value === undefined) continue;
      if (value === null) {
        payload[field] = null;
        continue;
      }
      if (typeof value !== "string") throw badRequest(`\`${field}\` must be a string or null.`);
      if (field === "finish_reason" && value.length > 100) {
        throw badRequest("`finish_reason` must be 100 characters or fewer.");
      }
      if (field === "error_message" && value.length > 4000) {
        throw badRequest("`error_message` must be 4000 characters or fewer.");
      }
      payload[field] = value;
    }

    for (const field of TOKEN_FIELDS) {
      const value = record[field];
      if (value === undefined) continue;
      const parsed = typeof value === "number" ? value : Number(value);
      if (!Number.isInteger(parsed) || parsed < 0) {
        throw badRequest(`\`${field}\` must be a non-negative whole number.`);
      }
      payload[field] = parsed;
    }

    for (const field of COST_FIELDS) {
      const value = record[field];
      if (value === undefined) continue;
      const parsed = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw badRequest(`\`${field}\` must be a non-negative number.`);
      }
      payload[field] = parsed;
    }

    if (record.status !== undefined) {
      if (!(STATUSES as readonly unknown[]).includes(record.status)) {
        throw badRequest("`status` must be one of pending, completed or failed.");
      }
      payload.status = record.status;
    }

    if (Object.keys(payload).length === 0) {
      throw badRequest("Send at least one field to update.");
    }

    const { data } = await callUpstream<unknown>({
      path: `/chat/sessions/${encodeURIComponent(sessionId)}/responses/${encodeURIComponent(responseId)}`,
      method: "PATCH",
      body: payload,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
