import { NextResponse } from "next/server";

import { establishSession, requestToken } from "@/server/auth";
import { HttpError, badRequest, toErrorResponse } from "@/server/errors";

/**
 * POST /api/auth/google (.agent/API.md #6).
 *
 * The browser posts a Google ID token; upstream verifies it, finds or creates
 * the user and returns `Token`. Tokens stay server-side, so the browser only
 * gets `{ user }` + Set-Cookie.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const { id_token: idToken } = (body ?? {}) as Record<string, unknown>;

    if (typeof idToken !== "string" || !idToken.trim()) {
      throw badRequest("A Google ID token is required.");
    }

    const token = await requestToken("/auth/google", { id_token: idToken.trim() });
    const session = await establishSession(token);

    return NextResponse.json({ user: session.user, expires_at: session.expires_at });
  } catch (error) {
    // Upstream answers 503 when GOOGLE_CLIENT_ID is not configured.
    if (error instanceof HttpError && error.status === 503) {
      return toErrorResponse(
        new HttpError("upstream", 503, "Google sign-in is not configured on the server."),
      );
    }
    return toErrorResponse(error);
  }
}
