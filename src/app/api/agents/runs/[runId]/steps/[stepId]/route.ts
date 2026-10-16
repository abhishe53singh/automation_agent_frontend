import { NextResponse } from "next/server";
import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

interface Context {
  params: Promise<{ runId: string; stepId: string }>;
}

export async function PATCH(request: Request, context: Context): Promise<NextResponse> {
  try {
    const { runId, stepId } = await context.params;
    const body: unknown = await request.json();
    const { data } = await callUpstream<unknown>({
      path: `/agents/runs/${encodeURIComponent(runId)}/steps/${encodeURIComponent(stepId)}`,
      method: "PATCH",
      body: body ?? {},
      timeoutMs: 15_000,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

