import { NextResponse } from "next/server";

import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * Pickable chat tools (upstream GET /chat/tools).
 *
 * Lists the tools the composer's "+" menu can attach to a turn, including
 * unavailable ones (with `unavailable_reason`) so the UI can explain why.
 */

export async function GET(): Promise<NextResponse> {
  try {
    const { data } = await callUpstream<unknown>({ path: "/chat/tools" });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
