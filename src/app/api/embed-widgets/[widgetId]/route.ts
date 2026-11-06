import { NextResponse } from "next/server";

import { readJsonObject, requireId } from "@/app/api/embed-widgets/_lib/guards";
import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/** Website chat widget detail: GET / PATCH (partial) / DELETE. */

interface Context {
  params: Promise<{ widgetId: string }>;
}

async function widgetPath(context: Context): Promise<string> {
  const { widgetId } = await context.params;
  return `/embed-widgets/${encodeURIComponent(requireId(widgetId, "widget id"))}`;
}

export async function GET(_request: Request, context: Context): Promise<NextResponse> {
  try {
    const { data } = await callUpstream<unknown>({ path: await widgetPath(context) });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context): Promise<NextResponse> {
  try {
    const path = await widgetPath(context);
    const body = await readJsonObject(request);
    const { data } = await callUpstream<unknown>({
      path,
      method: "PATCH",
      body,
      timeoutMs: 15_000,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context): Promise<NextResponse> {
  try {
    await callUpstream<unknown>({ path: await widgetPath(context), method: "DELETE" });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
