import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * Citations collection (phase_5.txt item 47).
 *
 * GET  — list citations (filtered by response_id or retrieval_id).
 * POST — create a citation linking a response to retrieved chunks.
 */

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const params = new URL(request.url).searchParams;
    const { data } = await callUpstream<unknown>({
      path: "/citations",
      query: {
        response_id: params.get("responseId") || undefined,
        retrieval_id: params.get("retrievalId") || undefined,
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
    const record = (body ?? {}) as Record<string, unknown>;

    if (typeof record.response_id !== "string" || !record.response_id.trim()) {
      throw badRequest("A response_id is required.");
    }

    const { data } = await callUpstream<unknown>({
      path: "/citations",
      method: "POST",
      body: record,
      timeoutMs: 15_000,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

