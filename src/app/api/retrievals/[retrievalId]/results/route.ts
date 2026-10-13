import { NextResponse } from "next/server";

import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/** Retrieval results (phase_5.txt item 46). */

interface Context {
  params: Promise<{ retrievalId: string }>;
}

export async function GET(_request: Request, context: Context): Promise<NextResponse> {
  try {
    const { retrievalId } = await context.params;
    const { data } = await callUpstream<unknown>({
      path: `/retrievals/${encodeURIComponent(retrievalId)}/results`,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

