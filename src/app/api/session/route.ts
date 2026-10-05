import { NextResponse } from "next/server";

import { getServerEnv } from "@/config/env";
import { decodeJwtExpiry, getAccessToken } from "@/server/session";
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
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ user: null, expires_at: null });
  }

  try {
    const { data } = await callUpstream<unknown>({ path: "/users/me" });
    return NextResponse.json({ user: data, expires_at: decodeJwtExpiry(accessToken) });
  } catch (error) {
    // callUpstream already cleared the cookies when the session was dead.
    if (getServerEnv().API_DEBUG) console.error("[session] resolve failed:", error);
    return NextResponse.json({ user: null, expires_at: null });
  }
}
