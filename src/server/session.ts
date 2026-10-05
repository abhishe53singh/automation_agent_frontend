import { cookies } from "next/headers";

import { getServerEnv } from "@/config/env";

/**
 * httpOnly session cookies (.agent/phase_2.txt item 10).
 *
 *   at — backend access JWT (~30 min), forwarded as `Authorization: Bearer`
 *   rt — backend refresh token (7 d default), rotates on every refresh
 *
 * Both are httpOnly + sameSite=lax + secure in production, so no token is ever
 * reachable from client JavaScript (no localStorage/sessionStorage either).
 */

export const ACCESS_COOKIE = "at";
export const REFRESH_COOKIE = "rt";

/** Mirrors the backend's ACCESS_TOKEN_EXPIRE_MINUTES default. */
const ACCESS_MAX_AGE_SECONDS = 30 * 60;
/** Mirrors the backend's REFRESH_TOKEN_EXPIRE_DAYS default. */
const REFRESH_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export async function getSessionTokens(): Promise<SessionTokens | null> {
  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE)?.value;
  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

/** The access token alone — enough for an authorization decision. */
export async function getAccessToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value ?? null;
}

/**
 * A session "exists" if either cookie is present; the access token alone is
 * enough for middleware, which must not make a network round trip.
 */
export async function hasSessionCookie(): Promise<boolean> {
  const store = await cookies();
  return Boolean(store.get(ACCESS_COOKIE)?.value || store.get(REFRESH_COOKIE)?.value);
}

/** Write both cookies. Call from a Route Handler or Server Action only. */
export async function setSessionCookies(tokens: SessionTokens): Promise<void> {
  const store = await cookies();
  const secure = isProduction();

  store.set(ACCESS_COOKIE, tokens.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: ACCESS_MAX_AGE_SECONDS,
  });
  store.set(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: REFRESH_MAX_AGE_SECONDS,
  });
}

/** Remove both cookies (logout, or a refresh that failed for good). */
export async function clearSessionCookies(): Promise<void> {
  const store = await cookies();
  const secure = isProduction();
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE]) {
    store.set(name, "", { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 0 });
  }
}

/**
 * Best-effort read of the access-token expiry for `/api/session`, decoded
 * WITHOUT verification (the backend remains the only authority). Returns null
 * when the token is missing or malformed — callers must not depend on it.
 */
export function decodeJwtExpiry(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as {
      exp?: unknown;
    };
    if (typeof payload.exp !== "number") return null;
    return new Date(payload.exp * 1000).toISOString();
  } catch {
    return null;
  }
}

/** True when the upstream host is reachable in principle (used by /api/health). */
export function upstreamBaseUrl(): string {
  return getServerEnv().API_BASE_URL.replace(/\/+$/, "");
}
