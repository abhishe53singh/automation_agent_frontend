import { NextResponse } from "next/server";
import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

interface Context {
  params: Promise<{ runId: string }>;
}

export async function GET(_request: Request, context: Context): Promise<NextResponse> {
  try {
    const { runId } = await context.params;
    const { data } = await callUpstream<unknown>({
      path: `/agents/runs/${encodeURIComponent(runId)}`,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

