import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * POST /api/chat/turns/status { turn_ids } — where each of the caller's turns
 * stands (running / completed / failed / partial / stalled). Used by the
 * app-wide watcher that notifies the user when a prompt finishes while they
 * are on another page or in another chat.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json().catch(() => ({}))) as { turn_ids?: unknown };
    const ids = body.turn_ids;
    if (!Array.isArray(ids) || ids.some((value) => typeof value !== "string")) {
      throw badRequest("`turn_ids` must be a list of ids.");
    }
    if (ids.length > 50) throw badRequest("Ask for at most 50 turns at a time.");
    const { data } = await callUpstream<unknown>({
      path: "/chat/turns/status",
      method: "POST",
      body: { turn_ids: ids },
    });
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
