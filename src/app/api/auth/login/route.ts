import { NextResponse } from "next/server";

import { establishSession, requestToken } from "@/server/auth";
import { badRequest, toErrorResponse } from "@/server/errors";

/**
 * POST /api/auth/login (.agent/API.md #3).
 *
 * Upstream `/auth/login` takes `application/x-www-form-urlencoded` and answers
 * with `Token`. That Token is consumed server-side: the browser receives only
 * `{ user }` plus the httpOnly `at`/`rt` Set-Cookie headers.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const { username, password } = (body ?? {}) as Record<string, unknown>;

    if (typeof username !== "string" || !username.trim()) {
      throw badRequest("Email or username is required.");
    }
    if (typeof password !== "string" || !password) {
      throw badRequest("Password is required.");
    }

    const token = await requestToken(
      "/auth/login",
      { username: username.trim(), password },
      { form: true },
    );
    const session = await establishSession(token);

    return NextResponse.json({ user: session.user, expires_at: session.expires_at });
  } catch (error) {
    return toErrorResponse(error);
  }
}
