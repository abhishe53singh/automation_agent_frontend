import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getServerEnv } from "@/config/env";
import { clearSessionCookies, REFRESH_COOKIE, upstreamBaseUrl } from "@/server/session";

/**
 * POST /api/auth/logout (.agent/API.md #7).
 *
 * Idempotent: the refresh token is revoked upstream (best effort) and the
 * cookies are cleared unconditionally, so the user always ends up signed out
 * even when the backend is unreachable.
 */
export async function POST(): Promise<NextResponse> {
  const refreshToken = (await cookies()).get(REFRESH_COOKIE)?.value;

  if (refreshToken) {
    try {
      await fetch(`${upstreamBaseUrl()}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
    } catch (error) {
      if (getServerEnv().API_DEBUG) {
        console.error("[auth] upstream logout failed (continuing):", error);
      }
    }
  }

  await clearSessionCookies();
  return NextResponse.json({ message: "Logged out" });
}
