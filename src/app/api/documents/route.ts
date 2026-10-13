import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * Documents collection (phase_5.txt item 43, upstream /documents).
 *
 * GET  — list documents for the caller (optional project_id filter).
 * POST — create a document directly from inline text (no upload).
 */

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const params = new URL(request.url).searchParams;
    const { data } = await callUpstream<unknown>({
      path: "/documents",
      query: {
        project_id: params.get("projectId") || undefined,
        status: params.get("status") || undefined,
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

    if (typeof record.title !== "string" || !record.title.trim()) {
      throw badRequest("A title is required.");
    }
    if (typeof record.text !== "string" || !record.text.trim()) {
      throw badRequest("Document text is required.");
    }

    const payload: Record<string, unknown> = {
      title: record.title.trim(),
      text: record.text.trim(),
    };
    if (record.project_id !== undefined) payload.project_id = record.project_id;
    if (record.language !== undefined) payload.language = record.language;

    const { data } = await callUpstream<unknown>({
      path: "/documents",
      method: "POST",
      body: payload,
      timeoutMs: 30_000,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

