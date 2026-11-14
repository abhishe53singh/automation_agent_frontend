import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * POST /api/chat/sessions/{sessionId}/stop
 *
 * The composer's Stop button. Upstream stops every model still answering in
 * this chat: text already written is kept, models that had not started
 * answering are marked "Stopped by user." (Retry still works).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse> {
  try {
    const { sessionId } = await params;
    if (!sessionId) throw badRequest("A session id is required.");

    const { data } = await callUpstream<unknown>({
      path: `/chat/sessions/${encodeURIComponent(sessionId)}/stop`,
      method: "POST",
      body: {},
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
