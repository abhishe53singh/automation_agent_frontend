import { NextResponse } from "next/server";

import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/** Provider connection detail + delete (phase_6.txt item 50). */

interface Context {
  params: Promise<{ connectionId: string }>;
}

export async function GET(_request: Request, context: Context): Promise<NextResponse> {
  try {
    const { connectionId } = await context.params;
    const { data } = await callUpstream<unknown>({
      path: `/integrations/connections/${encodeURIComponent(connectionId)}`,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context): Promise<NextResponse> {
  try {
    const { connectionId } = await context.params;
    await callUpstream<unknown>({
      path: `/integrations/connections/${encodeURIComponent(connectionId)}`,
      method: "DELETE",
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

