import { NextResponse } from "next/server";

import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * KB per-document controls (phase_5.txt item 45).
 * PATCH — enable/disable a document attachment.
 * DELETE — detach a document from the KB.
 */

interface Context {
  params: Promise<{ kbId: string; documentId: string }>;
}

export async function PATCH(request: Request, context: Context): Promise<NextResponse> {
  try {
    const { kbId, documentId } = await context.params;
    const body: unknown = await request.json();
    const { data } = await callUpstream<unknown>({
      path: `/knowledge-bases/${encodeURIComponent(kbId)}/documents/${encodeURIComponent(documentId)}`,
      method: "PATCH",
      body: body ?? {},
      timeoutMs: 15_000,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context): Promise<NextResponse> {
  try {
    const { kbId, documentId } = await context.params;
    await callUpstream<unknown>({
      path: `/knowledge-bases/${encodeURIComponent(kbId)}/documents/${encodeURIComponent(documentId)}`,
      method: "DELETE",
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

