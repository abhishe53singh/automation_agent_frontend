import { NextResponse } from "next/server";

import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/** Agent tools (phase_6.txt item 52). */

interface Context {
  params: Promise<{ agentId: string }>;
}

export async function GET(_request: Request, context: Context): Promise<NextResponse> {
  try {
    const { agentId } = await context.params;
    const { data } = await callUpstream<unknown>({
      path: `/agents/${encodeURIComponent(agentId)}/tools`,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request, context: Context): Promise<NextResponse> {
  try {
    const { agentId } = await context.params;
    const body: unknown = await request.json();
    const { data } = await callUpstream<unknown>({
      path: `/agents/${encodeURIComponent(agentId)}/tools`,
      method: "POST",
      body: body ?? {},
      timeoutMs: 15_000,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

