import { NextResponse } from "next/server";

import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * MCP servers collection (phase_6.txt item 51).
 * GET — list MCP servers; POST — create MCP server.
 */

export async function GET(_request: Request): Promise<NextResponse> {
  try {
    const { data } = await callUpstream<unknown>({ path: "/mcp/servers" });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const { data } = await callUpstream<unknown>({
      path: "/mcp/servers",
      method: "POST",
      body: body ?? {},
      timeoutMs: 15_000,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

