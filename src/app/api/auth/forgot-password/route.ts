import { NextResponse } from "next/server";

import { requestAuthMessage } from "@/server/auth";
import { badRequest, toErrorResponse } from "@/server/errors";

/**
 * POST /api/auth/forgot-password (.agent/API.md #4).
 *
 * Raw-token passthrough: the backend sends no email in this configuration, so
 * `reset_token` is returned as-is when an active account exists and `null`
 * otherwise (identical response either way — no account enumeration).
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const { email } = (body ?? {}) as Record<string, unknown>;

    if (typeof email !== "string" || !email.trim() || !email.includes("@")) {
      throw badRequest("A valid email address is required.");
    }

    const result = await requestAuthMessage("/auth/forgot-password", { email: email.trim() });
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
