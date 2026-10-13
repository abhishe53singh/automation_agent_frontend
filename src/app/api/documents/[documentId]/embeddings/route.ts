import { NextResponse } from "next/server";

import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * Reindex (re-chunk + re-embed) a document (phase_5.txt item 43).
 * POST /api/documents/{id}/embeddings → upstream POST /documents/{id}/embeddings
 */

interface Context {
  params: Promise<{ documentId: string }>;
}

export async function GET(_request: Request, context: Context): Promise<NextResponse> {
  try {
    const { documentId } = await context.params;
    const { data } = await callUpstream<unknown>({
      path: `/documents/${encodeURIComponent(documentId)}/embeddings`,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request, context: Context): Promise<NextResponse> {
  try {
    const { documentId } = await context.params;
    const body: unknown = await request.json().catch(() => ({}));
    const { data } = await callUpstream<unknown>({
      path: `/documents/${encodeURIComponent(documentId)}/embeddings`,
      method: "POST",
      body: body ?? {},
      timeoutMs: 120_000,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

