import { NextResponse } from "next/server";

import { getServerEnv } from "@/config/env";
import { decodeJwtExpiry, getAccessToken, hasSessionCookie } from "@/server/session";
import { callUpstream } from "@/server/upstream";

/**
 * GET /api/session (.agent/API.md #8).
 *
 * Resolves the cookie session to a user by calling upstream `GET /users/me`
 * server-side. Always 200 — an unusable session answers `{ user: null }` so
 * middleware and the (app) layout can redirect without inspecting an error
 * envelope.
 */
export async function GET(): Promise<NextResponse> {
  // An expired access cookie alone is not "signed out": callUpstream renews
  // it with the refresh cookie, as every other BFF route does.
  if (!(await hasSessionCookie())) {
    return NextResponse.json({ user: null, expires_at: null });
  }

  try {
    const { data } = await callUpstream<unknown>({ path: "/users/me" });
    // Read after the call: a refresh may have just rotated the token.
    const accessToken = await getAccessToken();
    return NextResponse.json({
      user: data,
      expires_at: accessToken ? decodeJwtExpiry(accessToken) : null,
    });
  } catch (error) {
    // callUpstream already cleared the cookies when the session was dead.
    if (getServerEnv().API_DEBUG) console.error("[session] resolve failed:", error);
    return NextResponse.json({ user: null, expires_at: null });
  }
}
