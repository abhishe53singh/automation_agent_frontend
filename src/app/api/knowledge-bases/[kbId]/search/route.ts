import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * KB search endpoint (phase_5.txt item 46).
 * POST — run retrieval search against a knowledge base.
 */

interface Context {
  params: Promise<{ kbId: string }>;
}

export async function POST(request: Request, context: Context): Promise<NextResponse> {
  try {
    const { kbId } = await context.params;
    const body: unknown = await request.json();
    const record = (body ?? {}) as Record<string, unknown>;

    if (typeof record.query !== "string" || !record.query.trim()) {
      throw badRequest("A search query is required.");
    }

    const { data } = await callUpstream<unknown>({
      path: `/knowledge-bases/${encodeURIComponent(kbId)}/search`,
      method: "POST",
      body: record,
      timeoutMs: 30_000,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

