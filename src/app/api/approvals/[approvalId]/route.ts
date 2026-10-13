import { NextResponse } from "next/server";

import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/** Approval detail + decision (phase_6.txt items 51/54). */

interface Context {
  params: Promise<{ approvalId: string }>;
}

export async function GET(_request: Request, context: Context): Promise<NextResponse> {
  try {
    const { approvalId } = await context.params;
    const { data } = await callUpstream<unknown>({
      path: `/approvals/${encodeURIComponent(approvalId)}`,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

