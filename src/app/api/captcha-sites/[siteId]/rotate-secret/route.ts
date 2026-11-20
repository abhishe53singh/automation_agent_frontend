import { NextResponse } from "next/server";

import { requireUuid } from "@/app/api/embed-widgets/_lib/guards";
import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/** Issue a new secret; the old one stops verifying immediately. Returned once. */
export async function POST(
  _request: Request,
  context: { params: Promise<{ siteId: string }> },
): Promise<NextResponse> {
  try {
    const { siteId } = await context.params;
    const { data } = await callUpstream<unknown>({
      path: `/captcha-sites/${requireUuid(siteId, "site id")}/rotate-secret`,
      method: "POST",
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
