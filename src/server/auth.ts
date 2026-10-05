import { HttpError, codeForUpstreamStatus, messageFromUpstream } from "./errors";
import { decodeJwtExpiry, setSessionCookies, upstreamBaseUrl } from "./session";

/**
 * Server-only auth helpers (.agent/phase_2.txt item 12). The upstream `Token`
 * JSON is consumed HERE and never forwarded: the browser only ever receives the
 * user object plus `Set-Cookie` headers.
 */

export interface UpstreamToken {
  access_token: string;
  refresh_token: string;
}

function isUpstreamToken(value: unknown): value is UpstreamToken {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as UpstreamToken).access_token === "string" &&
    (value as UpstreamToken).access_token.length > 0 &&
    typeof (value as UpstreamToken).refresh_token === "string" &&
    (value as UpstreamToken).refresh_token.length > 0
  );
}

/** Turn a FastAPI error body into the right HttpError for the browser. */
export function upstreamAuthError(status: number, body: unknown, fallback: string): HttpError {
  const code = codeForUpstreamStatus(status);
  const message = code === "not_found" ? "Not found." : messageFromUpstream(body, fallback);
  return new HttpError(code, status, message);
}

/** POST a public auth endpoint and require a valid `Token` back. */
export async function requestToken(
  path: string,
  payload: Record<string, unknown> | Record<string, string> | FormData,
  options: { form?: boolean; timeoutMs?: number } = {},
): Promise<UpstreamToken> {
  const { form = false, timeoutMs = 20_000 } = options;

  const headers: Record<string, string> = { Accept: "application/json" };
  let body: BodyInit;
  if (payload instanceof FormData) {
    body = payload;
  } else if (form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(payload as Record<string, string>).toString();
  } else {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(payload);
  }

  let response: Response;
  try {
    response = await fetch(`${upstreamBaseUrl()}${path}`, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const isTimeout =
      error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    if (isTimeout) throw new HttpError("timeout", 504, "The upstream request timed out.");
    throw new HttpError("upstream", 502, "Cannot reach the upstream service.");
  }

  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    parsed = undefined;
  }

  if (!response.ok) {
    throw upstreamAuthError(response.status, parsed, "Authentication failed.");
  }
  if (!isUpstreamToken(parsed)) {
    // A 200 without a usable Token is a contract break, not a silent success.
    console.error("[auth] upstream returned a non-Token body for", path);
    throw new HttpError("upstream", 502, "Authentication failed.");
  }
  return parsed;
}

/**
 * Resolve `Token` -> session cookies -> `UserResponse` via `GET /users/me`,
 * then set the httpOnly cookies. Returns the user and the access-token expiry.
 */
export async function establishSession(token: UpstreamToken): Promise<{
  user: unknown;
  expires_at: string | null;
}> {
  await setSessionCookies({ accessToken: token.access_token, refreshToken: token.refresh_token });

  let response: Response;
  try {
    response = await fetch(`${upstreamBaseUrl()}/users/me`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token.access_token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    // The session is valid; a transient /users/me failure should not fail login.
    return { user: null, expires_at: decodeJwtExpiry(token.access_token) };
  }

  if (!response.ok) {
    const code = codeForUpstreamStatus(response.status);
    // 401/403 right after login means the account/token is not usable.
    throw new HttpError(code, response.status, "Authentication failed.");
  }
  const user: unknown = await response.json();
  return { user, expires_at: decodeJwtExpiry(token.access_token) };
}

/** POST a public auth endpoint that answers with a plain JSON payload. */
export async function requestAuthJson(
  path: string,
  payload: Record<string, unknown>,
  method: "POST" | "PATCH" | "GET" = "POST",
): Promise<unknown> {
  const response = await authFetch(path, method, JSON.stringify(payload));
  const parsed: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw upstreamAuthError(response.status, parsed, "The request failed.");
  }
  return parsed;
}

/** POST a public auth endpoint that answers with a plain message payload. */
export async function requestAuthMessage(
  path: string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  return requestAuthJson(path, payload);
}

async function authFetch(path: string, method: string, body: string): Promise<Response> {
  try {
    return await fetch(`${upstreamBaseUrl()}${path}`, {
      method,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    const isTimeout =
      error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    if (isTimeout) throw new HttpError("timeout", 504, "The upstream request timed out.");
    throw new HttpError("upstream", 502, "Cannot reach the upstream service.");
  }
}
