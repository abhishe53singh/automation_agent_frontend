import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/** POST /api/llm/models/purge-preview { ids } — what a permanent delete removes. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json().catch(() => ({}))) as { ids?: unknown };
    if (!Array.isArray(body.ids) || body.ids.some((value) => typeof value !== "string")) {
      throw badRequest("`ids` must be a list of ids.");
    }
    const { data } = await callUpstream<unknown>({
      path: "/llm/models/purge-preview",
      method: "POST",
      body: { ids: body.ids },
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
