import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * POST /api/chat/sessions/{sessionId}/turns/{turnId}/generate
 *
 * The chat UI's Retry button. Upstream resets the turn's failed responses
 * (or only `response_ids`) to pending and generates them again; completed
 * answers are never re-run. A turn can call the LLM and several tools, so
 * this gets a longer budget than an ordinary mutation.
 */

const GENERATE_TIMEOUT_MS = 180_000;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string; turnId: string }> },
): Promise<NextResponse> {
  try {
    const { sessionId, turnId } = await params;
    if (!sessionId || !turnId) throw badRequest("A session id and turn id are required.");

    const body: unknown = await request.json().catch(() => ({}));
    const { response_ids: responseIds } = (body ?? {}) as Record<string, unknown>;

    if (
      responseIds !== undefined &&
      (!Array.isArray(responseIds) || responseIds.some((value) => typeof value !== "string"))
    ) {
      throw badRequest("`response_ids` must be a list of strings.");
    }

    const { data } = await callUpstream<unknown>({
      path: `/chat/sessions/${encodeURIComponent(sessionId)}/turns/${encodeURIComponent(turnId)}/generate`,
      method: "POST",
      body: Array.isArray(responseIds) ? { response_ids: responseIds } : {},
      timeoutMs: GENERATE_TIMEOUT_MS,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
