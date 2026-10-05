import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * One chat session (.agent/API.md #32-#34, upstream #32-#34).
 *
 * Sessions are strictly caller-owned upstream: a session the caller does not
 * own resolves as 404, never 403, so the existing mask pass-through applies
 * unchanged.
 */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse> {
  try {
    const { sessionId } = await params;
    if (!sessionId) throw badRequest("A session id is required.");

    const { data } = await callUpstream<unknown>({
      path: `/chat/sessions/${encodeURIComponent(sessionId)}`,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse> {
  try {
    const { sessionId } = await params;
    if (!sessionId) throw badRequest("A session id is required.");

    const body: unknown = await request.json();
    const { title, is_archived: isArchived } = (body ?? {}) as Record<string, unknown>;
    const payload: Record<string, unknown> = {};

    if (title !== undefined) {
      if (typeof title !== "string") throw badRequest("`title` must be a string.");
      if (title.length > 200) throw badRequest("The chat title must be 200 characters or fewer.");
      // An empty string clears the title upstream (the column is nullable).
      payload.title = title.trim() || null;
    }
    if (isArchived !== undefined) {
      if (typeof isArchived !== "boolean") throw badRequest("`is_archived` must be a boolean.");
      payload.is_archived = isArchived;
    }

    if (Object.keys(payload).length === 0) {
      throw badRequest("Send at least one of `title` or `is_archived`.");
    }

    const { data } = await callUpstream<unknown>({
      path: `/chat/sessions/${encodeURIComponent(sessionId)}`,
      method: "PATCH",
      body: payload,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse> {
  try {
    const { sessionId } = await params;
    if (!sessionId) throw badRequest("A session id is required.");

    await callUpstream({
      path: `/chat/sessions/${encodeURIComponent(sessionId)}`,
      method: "DELETE",
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
