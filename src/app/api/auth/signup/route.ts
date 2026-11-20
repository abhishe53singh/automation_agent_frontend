import { NextResponse } from "next/server";

import { establishSession, requestAuthJson, requestToken } from "@/server/auth";
import { badRequest, toErrorResponse } from "@/server/errors";

/**
 * POST /api/auth/signup (.agent/API.md #2). Upstream `/auth/signup` answers with
 * a bare `UserResponse` (no tokens), so this route creates the account and then
 * signs the user in immediately — one browser round trip instead of two forms.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const { username, email, password, captcha_token } = (body ?? {}) as Record<string, unknown>;

    if (typeof username !== "string" || !username.trim()) {
      throw badRequest("Username is required.");
    }
    if (typeof email !== "string" || !email.trim() || !email.includes("@")) {
      throw badRequest("A valid email address is required.");
    }
    if (typeof password !== "string" || password.length < 8) {
      throw badRequest("Password must be at least 8 characters.");
    }

    const credentials = { username: username.trim(), email: email.trim(), password };

    // Create the account. Upstream 400 = captcha missing/expired or
    // username/email already taken; the server errors helper maps that to
    // error.validation. The captcha token (self-hosted, single use) is
    // verified by the backend before anything else.
    const user = await requestAuthJson("/auth/signup", {
      ...credentials,
      captcha_token: typeof captcha_token === "string" ? captcha_token.slice(0, 200) : undefined,
    });

    // Then establish the session (sets the httpOnly cookies).
    // NOTE: upstream `/auth/login` takes form-urlencoded, not JSON.
    const token = await requestToken(
      "/auth/login",
      { username: credentials.username, password: credentials.password },
      { form: true },
    );
    const session = await establishSession(token);

    return NextResponse.json({ user: session.user ?? user }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
