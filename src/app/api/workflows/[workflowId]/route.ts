import { NextResponse } from "next/server";

import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/** Workflow detail CRUD (phase_6.txt item 53). */

interface Context {
  params: Promise<{ workflowId: string }>;
}

export async function GET(_request: Request, context: Context): Promise<NextResponse> {
  try {
    const { workflowId } = await context.params;
    const { data } = await callUpstream<unknown>({
      path: `/workflows/${encodeURIComponent(workflowId)}`,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context): Promise<NextResponse> {
  try {
    const { workflowId } = await context.params;
    const body: unknown = await request.json();
    const { data } = await callUpstream<unknown>({
      path: `/workflows/${encodeURIComponent(workflowId)}`,
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
    const { workflowId } = await context.params;
    await callUpstream<unknown>({
      path: `/workflows/${encodeURIComponent(workflowId)}`,
      method: "DELETE",
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

