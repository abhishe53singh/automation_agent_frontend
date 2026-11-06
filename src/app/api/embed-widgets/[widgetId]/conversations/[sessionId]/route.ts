import { NextResponse } from "next/server";

import { requireId } from "@/app/api/embed-widgets/_lib/guards";
import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/** Read-only transcript of one visitor conversation. */

interface Context {
  params: Promise<{ widgetId: string; sessionId: string }>;
}

export async function GET(_request: Request, context: Context): Promise<NextResponse> {
  try {
    const { widgetId, sessionId } = await context.params;
    const { data } = await callUpstream<unknown>({
      path: `/embed-widgets/${encodeURIComponent(
        requireId(widgetId, "widget id"),
      )}/conversations/${encodeURIComponent(requireId(sessionId, "conversation id"))}`,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
