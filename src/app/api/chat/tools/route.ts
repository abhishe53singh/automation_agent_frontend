import { NextResponse } from "next/server";

import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * Pickable chat tools (upstream GET /chat/tools).
 *
 * Lists the tools the composer's "+" menu can attach to a turn, including
 * unavailable ones (with `unavailable_reason`) so the UI can explain why.
 */

export async function GET(request: Request): Promise<NextResponse> {
  try {
    // `projectId` makes project-level Google connections count as available.
    const projectId = new URL(request.url).searchParams.get("projectId");
    const { data } = await callUpstream<unknown>({
      path: "/chat/tools",
      query: { project_id: projectId || undefined },
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
