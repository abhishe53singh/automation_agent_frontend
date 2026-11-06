import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/** DELETE one chat attachment (its chunks leave the chat's knowledge base). */

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string; attachmentId: string }> },
): Promise<NextResponse> {
  try {
    const { sessionId, attachmentId } = await params;
    if (!sessionId || !attachmentId) throw badRequest("A session and attachment id are required.");
    await callUpstream<unknown>({
      path: `/chat/sessions/${encodeURIComponent(sessionId)}/attachments/${encodeURIComponent(attachmentId)}`,
      method: "DELETE",
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
