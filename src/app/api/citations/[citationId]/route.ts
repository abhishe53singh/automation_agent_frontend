import { NextResponse } from "next/server";

import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/** Citation detail + delete (phase_5.txt item 47). */

interface Context {
  params: Promise<{ citationId: string }>;
}

export async function GET(_request: Request, context: Context): Promise<NextResponse> {
  try {
    const { citationId } = await context.params;
    const { data } = await callUpstream<unknown>({
      path: `/citations/${encodeURIComponent(citationId)}`,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context): Promise<NextResponse> {
  try {
    const { citationId } = await context.params;
    await callUpstream<unknown>({
      path: `/citations/${encodeURIComponent(citationId)}`,
      method: "DELETE",
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

