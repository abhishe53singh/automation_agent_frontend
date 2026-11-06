import { NextResponse } from "next/server";

import { requireId } from "@/app/api/embed-widgets/_lib/guards";
import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/** Issue a new public key for a widget; the old snippet stops working. */

interface Context {
  params: Promise<{ widgetId: string }>;
}

export async function POST(_request: Request, context: Context): Promise<NextResponse> {
  try {
    const { widgetId } = await context.params;
    const { data } = await callUpstream<unknown>({
      path: `/embed-widgets/${encodeURIComponent(requireId(widgetId, "widget id"))}/rotate-key`,
      method: "POST",
      timeoutMs: 15_000,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
