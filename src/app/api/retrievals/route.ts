import { NextResponse } from "next/server";

import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * Retrievals list (phase_5.txt item 46).
 * GET — list the caller's retrieval runs.
 */

export async function GET(_request: Request): Promise<NextResponse> {
  try {
    const { data } = await callUpstream<unknown>({ path: "/retrievals" });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

