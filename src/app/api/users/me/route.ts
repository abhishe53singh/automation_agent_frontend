import { NextResponse } from "next/server";

import { callUpstream } from "@/server/upstream";
import { HttpError, toErrorResponse } from "@/server/errors";

/**
 * GET /api/users/me (.agent/API.md #9) — upstream #9. Unlike /api/session this
 * route is explicit: no session means an explicit 401 envelope.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const { data } = await callUpstream<unknown>({ path: "/users/me" });
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) {
      return toErrorResponse(new HttpError("unauthorized", 401, "Not signed in."));
    }
    return toErrorResponse(error);
  }
}
