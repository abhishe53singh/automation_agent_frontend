import { NextResponse } from "next/server";

import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/** Document chunks list (phase_5.txt item 43). */

interface Context {
  params: Promise<{ documentId: string }>;
}

export async function GET(_request: Request, context: Context): Promise<NextResponse> {
  try {
    const { documentId } = await context.params;
    const { data } = await callUpstream<unknown>({
      path: `/documents/${encodeURIComponent(documentId)}/chunks`,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

