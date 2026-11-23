import { NextResponse } from "next/server";

import { callUpstream } from "@/server/upstream";
import { badRequest, toErrorResponse } from "@/server/errors";

/** GET /api/usage/me?days=30 — the signed-in user's own usage (billing tab). */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const days = new URL(request.url).searchParams.get("days") ?? "30";
    if (!/^\d{1,4}$/.test(days)) throw badRequest("Invalid period.");
    const { data } = await callUpstream<unknown>({ path: `/usage/me?days=${days}` });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
