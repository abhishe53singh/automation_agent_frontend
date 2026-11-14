import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * POST /api/llm/models/bulk { ids, action } — multi-select lifecycle:
 * archive | unarchive | delete (soft) | restore. Records whose status does
 * not fit the action are skipped and reported back, never failed.
 */
const ACTIONS = new Set(["archive", "unarchive", "delete", "restore", "purge"]);

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json().catch(() => ({}))) as { ids?: unknown; action?: unknown };
    if (!Array.isArray(body.ids) || body.ids.some((value) => typeof value !== "string")) {
      throw badRequest("`ids` must be a list of ids.");
    }
    if (typeof body.action !== "string" || !ACTIONS.has(body.action)) {
      throw badRequest("Unknown action.");
    }
    const { data } = await callUpstream<unknown>({
      path: "/llm/models/bulk",
      method: "POST",
      body: { ids: body.ids, action: body.action },
      timeoutMs: 30_000,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
