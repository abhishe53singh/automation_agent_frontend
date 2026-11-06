import { NextResponse } from "next/server";

import { boundedInt, requireId } from "@/app/api/embed-widgets/_lib/guards";
import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/** Read-only list of visitor conversations for a widget (`?limit=&offset=`). */

interface Context {
  params: Promise<{ widgetId: string }>;
}

export async function GET(request: Request, context: Context): Promise<NextResponse> {
  try {
    const { widgetId } = await context.params;
    const params = new URL(request.url).searchParams;
    const { data } = await callUpstream<unknown>({
      path: `/embed-widgets/${encodeURIComponent(requireId(widgetId, "widget id"))}/conversations`,
      query: {
        limit: boundedInt(params.get("limit"), { min: 1, max: 100 }),
        offset: boundedInt(params.get("offset"), { min: 0, max: 1_000_000 }),
      },
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
