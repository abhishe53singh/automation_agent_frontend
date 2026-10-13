import { NextResponse } from "next/server";

import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/** Approval decision (phase_6.txt item 54). */

interface Context {
  params: Promise<{ approvalId: string }>;
}

export async function POST(request: Request, context: Context): Promise<NextResponse> {
  try {
    const { approvalId } = await context.params;
    const body: unknown = await request.json();
    const { data } = await callUpstream<unknown>({
      path: `/approvals/${encodeURIComponent(approvalId)}/decision`,
      method: "POST",
      body: body ?? {},
      timeoutMs: 15_000,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

