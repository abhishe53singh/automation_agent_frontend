import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * Chat turns (.agent/API.md #37-#38, upstream #37-#38).
 *
 * POST submits one round: it creates the user message, the turn, and one
 * `pending` response per enabled session model. `parent_turn_id` branches the
 * conversation tree, which is what the "branch from here" UI sends.
 * GET returns the top-level turns, or — with `parentTurnId` — only that turn's
 * direct children, which is how the branch tree is walked.
 */

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse> {
  try {
    const { sessionId } = await params;
    if (!sessionId) throw badRequest("A session id is required.");

    const parentTurnId = new URL(request.url).searchParams.get("parentTurnId");
    const { data } = await callUpstream<unknown>({
      path: `/chat/sessions/${encodeURIComponent(sessionId)}/turns`,
      query: { parent_turn_id: parentTurnId || undefined },
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse> {
  try {
    const { sessionId } = await params;
    if (!sessionId) throw badRequest("A session id is required.");

    const body: unknown = await request.json();
    const {
      content,
      parent_turn_id: parentTurnId,
      model_ids: modelIds,
    } = (body ?? {}) as Record<string, unknown>;

    if (typeof content !== "string" || !content.trim()) {
      throw badRequest("A message is required.");
    }
    if (parentTurnId !== undefined && parentTurnId !== null && typeof parentTurnId !== "string") {
      throw badRequest("`parent_turn_id` must be a string.");
    }
    if (modelIds !== undefined && modelIds !== null) {
      if (!Array.isArray(modelIds) || modelIds.some((value) => typeof value !== "string")) {
        throw badRequest("`model_ids` must be a list of strings.");
      }
    }

    const payload: Record<string, unknown> = { content: content.trim() };
    if (typeof parentTurnId === "string" && parentTurnId.trim()) {
      payload.parent_turn_id = parentTurnId.trim();
    }
    if (Array.isArray(modelIds)) payload.model_ids = modelIds;

    const { data } = await callUpstream<unknown>({
      path: `/chat/sessions/${encodeURIComponent(sessionId)}/turns`,
      method: "POST",
      body: payload,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
