import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * Knowledge bases collection (phase_5.txt items 44-45).
 *
 * GET  — list all knowledge bases.
 * POST — create a new knowledge base (embedding settings fixed at creation).
 */

export async function GET(_request: Request): Promise<NextResponse> {
  try {
    const { data } = await callUpstream<unknown>({ path: "/knowledge-bases" });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const record = (body ?? {}) as Record<string, unknown>;

    if (typeof record.name !== "string" || !record.name.trim()) {
      throw badRequest("A name is required.");
    }

    const { data } = await callUpstream<unknown>({
      path: "/knowledge-bases",
      method: "POST",
      body: record,
      timeoutMs: 15_000,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

