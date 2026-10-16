import { NextResponse } from "next/server";
import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

interface Context {
  params: Promise<{ agentId: string; toolId: string }>;
}

export async function GET(_request: Request, context: Context): Promise<NextResponse> {
  try {
    const { agentId, toolId } = await context.params;
    const { data } = await callUpstream<unknown>({
      path: `/agents/${encodeURIComponent(agentId)}/tools/${encodeURIComponent(toolId)}`,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context): Promise<NextResponse> {
  try {
    const { agentId, toolId } = await context.params;
    const body: unknown = await request.json();
    const { data } = await callUpstream<unknown>({
      path: `/agents/${encodeURIComponent(agentId)}/tools/${encodeURIComponent(toolId)}`,
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
    const { agentId, toolId } = await context.params;
    await callUpstream<unknown>({
      path: `/agents/${encodeURIComponent(agentId)}/tools/${encodeURIComponent(toolId)}`,
      method: "DELETE",
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

