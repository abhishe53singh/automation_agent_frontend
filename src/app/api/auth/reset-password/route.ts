import { NextResponse } from "next/server";

import { requestAuthMessage } from "@/server/auth";
import { badRequest, toErrorResponse } from "@/server/errors";

/**
 * POST /api/auth/reset-password (.agent/API.md #5).
 *
 * Upstream 400 = invalid / reused / expired reset token -> error.validation.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const { token, new_password: newPassword } = (body ?? {}) as Record<string, unknown>;

    if (typeof token !== "string" || !token.trim()) {
      throw badRequest("The reset token is required.");
    }
    if (typeof newPassword !== "string" || newPassword.length < 8) {
      throw badRequest("Password must be at least 8 characters.");
    }

    const result = await requestAuthMessage("/auth/reset-password", {
      token: token.trim(),
      new_password: newPassword,
    });
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
