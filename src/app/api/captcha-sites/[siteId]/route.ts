import { NextResponse } from "next/server";

import { readJsonObject, requireUuid } from "@/app/api/embed-widgets/_lib/guards";
import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

interface Context {
  params: Promise<{ siteId: string }>;
}

/** PATCH renames / changes allowed websites / enables-disables; DELETE removes. */

export async function PATCH(request: Request, context: Context): Promise<NextResponse> {
  try {
    const { siteId } = await context.params;
    const { data } = await callUpstream<unknown>({
      path: `/captcha-sites/${requireUuid(siteId, "site id")}`,
      method: "PATCH",
      body: await readJsonObject(request),
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context): Promise<NextResponse> {
  try {
    const { siteId } = await context.params;
    await callUpstream<unknown>({
      path: `/captcha-sites/${requireUuid(siteId, "site id")}`,
      method: "DELETE",
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
