import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * GET /api/chat/sessions/{sessionId}/responses/{responseId}/context
 *
 * "Show context" on a chat answer: the exact messages (system prompt, summary,
 * retrieved history, knowledge passages, instructions, the prompt), the tools
 * offered and each tool call, as sent to the model. Never recorded for the
 * public website widget.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string; responseId: string }> },
): Promise<NextResponse> {
  try {
    const { sessionId, responseId } = await params;
    if (!sessionId || !responseId) throw badRequest("A session id and response id are required.");

    const { data } = await callUpstream<unknown>({
      path: `/chat/sessions/${encodeURIComponent(sessionId)}/responses/${encodeURIComponent(responseId)}/context`,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
