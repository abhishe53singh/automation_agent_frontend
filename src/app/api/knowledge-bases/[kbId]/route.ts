import { NextResponse } from "next/server";

import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/** Single knowledge base CRUD (phase_5.txt items 44-45). */

interface Context {
  params: Promise<{ kbId: string }>;
}

export async function GET(_request: Request, context: Context): Promise<NextResponse> {
  try {
    const { kbId } = await context.params;
    const { data } = await callUpstream<unknown>({
      path: `/knowledge-bases/${encodeURIComponent(kbId)}`,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context): Promise<NextResponse> {
  try {
    const { kbId } = await context.params;
    const body: unknown = await request.json();
    const { data } = await callUpstream<unknown>({
      path: `/knowledge-bases/${encodeURIComponent(kbId)}`,
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
    const { kbId } = await context.params;
    await callUpstream<unknown>({
      path: `/knowledge-bases/${encodeURIComponent(kbId)}`,
      method: "DELETE",
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

