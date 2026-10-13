import { NextResponse } from "next/server";

import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/** Agent runs (phase_6.txt item 52). */

interface Context {
  params: Promise<{ agentId: string }>;
}

export async function GET(request: Request, context: Context): Promise<NextResponse> {
  try {
    const { agentId } = await context.params;
    const params = new URL(request.url).searchParams;
    const { data } = await callUpstream<unknown>({
      path: `/agents/${encodeURIComponent(agentId)}/runs`,
      query: { status: params.get("status") || undefined },
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request, context: Context): Promise<NextResponse> {
  try {
    const { agentId } = await context.params;
    const body: unknown = await request.json().catch(() => ({}));
    const { data } = await callUpstream<unknown>({
      path: `/agents/${encodeURIComponent(agentId)}/runs`,
      method: "POST",
      body: body ?? {},
      timeoutMs: 30_000,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

