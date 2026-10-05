import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * The session's model set (.agent/API.md #35, upstream #35) — DECLARATIVE
 * replace: the sent list IS the new set, and an empty list detaches every
 * model. 400 for an unknown or inactive model id.
 */

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse> {
  try {
    const { sessionId } = await params;
    if (!sessionId) throw badRequest("A session id is required.");

    const body: unknown = await request.json();
    const { model_ids: modelIds } = (body ?? {}) as Record<string, unknown>;
    if (!Array.isArray(modelIds) || modelIds.some((value) => typeof value !== "string")) {
      throw badRequest("`model_ids` must be a list of model ids (an empty list detaches all).");
    }

    const { data } = await callUpstream<unknown>({
      path: `/chat/sessions/${encodeURIComponent(sessionId)}/models`,
      method: "PUT",
      body: { model_ids: modelIds },
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
