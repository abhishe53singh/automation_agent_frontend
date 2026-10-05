import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * One attached session model (.agent/API.md #36, upstream #36).
 *
 * Enables/disables a model for future rounds WITHOUT detaching it. 404 when
 * the model is not attached to this session.
 */

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string; modelId: string }> },
): Promise<NextResponse> {
  try {
    const { sessionId, modelId } = await params;
    if (!sessionId || !modelId) throw badRequest("A session id and model id are required.");

    const body: unknown = await request.json();
    const { is_enabled: isEnabled } = (body ?? {}) as Record<string, unknown>;
    if (typeof isEnabled !== "boolean") throw badRequest("`is_enabled` must be a boolean.");

    const { data } = await callUpstream<unknown>({
      path: `/chat/sessions/${encodeURIComponent(sessionId)}/models/${encodeURIComponent(modelId)}`,
      method: "PATCH",
      body: { is_enabled: isEnabled },
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
