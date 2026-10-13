import { NextResponse } from "next/server";

import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/** Approvals collection (phase_6.txt items 51/54). */

export async function GET(_request: Request): Promise<NextResponse> {
  try {
    const { data } = await callUpstream<unknown>({ path: "/approvals" });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const { data } = await callUpstream<unknown>({
      path: "/approvals",
      method: "POST",
      body: body ?? {},
      timeoutMs: 15_000,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

