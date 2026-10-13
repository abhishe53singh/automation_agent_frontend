import { NextResponse } from "next/server";

import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * KB document membership (phase_5.txt item 45).
 *
 * GET — list attached documents.
 * PUT — declarative replace of the full document set (all-or-nothing).
 */

interface Context {
  params: Promise<{ kbId: string }>;
}

export async function GET(_request: Request, context: Context): Promise<NextResponse> {
  try {
    const { kbId } = await context.params;
    const { data } = await callUpstream<unknown>({
      path: `/knowledge-bases/${encodeURIComponent(kbId)}/documents`,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(request: Request, context: Context): Promise<NextResponse> {
  try {
    const { kbId } = await context.params;
    const body: unknown = await request.json();
    const { data } = await callUpstream<unknown>({
      path: `/knowledge-bases/${encodeURIComponent(kbId)}/documents`,
      method: "PUT",
      body: body ?? {},
      timeoutMs: 30_000,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

