import { NextResponse } from "next/server";

import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * Provider connections collection (phase_6.txt item 50).
 * GET — list connections; POST — create connection.
 */

export async function GET(_request: Request): Promise<NextResponse> {
  try {
    const { data } = await callUpstream<unknown>({ path: "/integrations/connections" });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const { data } = await callUpstream<unknown>({
      path: "/integrations/connections",
      method: "POST",
      body: body ?? {},
      timeoutMs: 15_000,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

