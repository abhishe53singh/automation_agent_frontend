import { NextResponse } from "next/server";

import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * Workflows collection (phase_6.txt item 53).
 * GET — list workflows; POST — create workflow.
 */

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const params = new URL(request.url).searchParams;
    const { data } = await callUpstream<unknown>({
      path: "/workflows",
      query: {
        project_id: params.get("projectId") || undefined,
        is_active: params.get("isActive") || undefined,
      },
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const { data } = await callUpstream<unknown>({
      path: "/workflows",
      method: "POST",
      body: body ?? {},
      timeoutMs: 15_000,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

