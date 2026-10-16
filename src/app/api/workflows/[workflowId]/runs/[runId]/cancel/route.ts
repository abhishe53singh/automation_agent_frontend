import { NextResponse } from "next/server";
import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

interface Context {
  params: Promise<{ workflowId: string; runId: string }>;
}

export async function POST(_request: Request, context: Context): Promise<NextResponse> {
  try {
    const { workflowId, runId } = await context.params;
    const { data } = await callUpstream<unknown>({
      path: `/workflows/${encodeURIComponent(workflowId)}/runs/${encodeURIComponent(runId)}/cancel`,
      method: "POST",
      timeoutMs: 15_000,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

