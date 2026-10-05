import { NextResponse } from "next/server";

import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * Every message in the session, in insertion order (.agent/API.md #39,
 * upstream #39). The conversation UI renders turns, not this flat list; it
 * backs "view raw history" and is what the smoke test uses to assert that a
 * turn actually persisted its user message.
 */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse> {
  try {
    const { sessionId } = await params;
    const { data } = await callUpstream<unknown>({
      path: `/chat/sessions/${encodeURIComponent(sessionId)}/messages`,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
