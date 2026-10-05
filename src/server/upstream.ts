import { cookies } from "next/headers";

import { getServerEnv } from "@/config/env";
import { HttpError, codeForUpstreamStatus, messageFromUpstream } from "./errors";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearSessionCookies,
  setSessionCookies,
  upstreamBaseUrl,
} from "./session";

/**
 * Upstream proxy with refresh-on-401 (.agent/phase_2.txt items 10-11).
 *
 * Only this module knows the FastAPI host. It attaches
 * `Authorization: Bearer <at>` to every call, and when the backend answers 401
 * it rotates the refresh token via `POST /auth/refresh`, re-sends the request
 * exactly ONCE, and otherwise gives up and clears the cookies.
 */

export interface UpstreamRequest {
  path: string;
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  /** Serialized as JSON unless it is FormData/ArrayBuffer (uploads pass through). */
  body?: unknown;
  /** Send a form-urlencoded body — the backend's /auth/login expects that. */
  form?: Record<string, string>;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | null | undefined>;
  /** Skip the Authorization header (public upstream routes). */
  anonymous?: boolean;
  timeoutMs?: number;
}

export interface UpstreamResult<T = unknown> {
  data: T;
  status: number;
  headers: Headers;
}

interface TokenPair {
  access_token: string;
  refresh_token: string;
}

const DEFAULT_UPSTREAM_TIMEOUT_MS = 20_000;
const REFRESH_TIMEOUT_MS = 10_000;

function buildQuery(query: UpstreamRequest["query"]): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function isTokenPair(value: unknown): value is TokenPair {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as TokenPair).access_token === "string" &&
    typeof (value as TokenPair).refresh_token === "string"
  );
}

/**
 * Single-flight refresh (.agent/API_CONTEXT.txt §2). The backend REVOKES the
 * presented refresh token on rotation, so two concurrent refreshes would leave
 * the loser holding a dead token and log the user out. One in-flight promise is
 * therefore shared by every waiter.
 *
 * Exported so `upstream-stream.ts` reuses the SAME single-flight promise — a
 * second implementation would reintroduce the very race this prevents.
 */
let refreshInFlight: Promise<boolean> | null = null;

export function refreshTokens(): Promise<boolean> {
  refreshInFlight ??= performRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function performRefresh(): Promise<boolean> {
  const refreshToken = (await cookies()).get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${upstreamBaseUrl()}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
      signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS),
    });
    if (!response.ok) {
      if (getServerEnv().API_DEBUG) {
        console.error(`[upstream] refresh failed with status ${response.status}`);
      }
      return false;
    }

    const payload: unknown = await response.json();
    if (!isTokenPair(payload)) {
      console.error("[upstream] refresh returned a malformed Token payload");
      return false;
    }

    await setSessionCookies({
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
    });
    return true;
  } catch (error) {
    console.error("[upstream] refresh request failed:", error);
    return false;
  }
}
function requestInit(request: UpstreamRequest, accessToken: string | null): RequestInit {
  const headers: Record<string, string> = { Accept: "application/json", ...request.headers };

  let body: BodyInit | undefined;
  if (request.form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(request.form).toString();
  } else if (request.body instanceof FormData || request.body instanceof ArrayBuffer) {
    // Multipart / binary passthrough: never set Content-Type ourselves.
    body = request.body as BodyInit;
  } else if (request.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(request.body);
  }

  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  return {
    method: request.method ?? "GET",
    headers,
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(request.timeoutMs ?? DEFAULT_UPSTREAM_TIMEOUT_MS),
  };
}

/**
 * Perform one authenticated upstream call, refreshing once on 401.
 *
 * Throws `HttpError` carrying the normalized envelope code so the route handler
 * can return it verbatim; a transport failure becomes `upstream`/`timeout`.
 */
export async function callUpstream<T = unknown>(
  request: UpstreamRequest,
): Promise<UpstreamResult<T>> {
  const url = `${upstreamBaseUrl()}${request.path}${buildQuery(request.query)}`;

  if (request.anonymous) {
    return assertOk<T>(request, await safeFetch(request, url, null));
  }

  let accessToken = await readCookie(ACCESS_COOKIE);
  if (!accessToken) {
    // No access cookie: a refresh may still rescue the session.
    if (!(await refreshTokens())) throw new HttpError("unauthorized", 401, "Not signed in.");
    accessToken = await readCookie(ACCESS_COOKIE);
    if (!accessToken) throw new HttpError("unauthorized", 401, "Not signed in.");
  }

  let response = await safeFetch(request, url, accessToken);
  if (response.status !== 401) return assertOk<T>(request, response);

  // 401: rotate once, then retry the upstream call ONCE.
  const rotated = await rotateOrGiveUp();
  if (rotated) {
    response = await safeFetch(request, url, (await readCookie(ACCESS_COOKIE)) ?? "");
    if (response.status !== 401) return assertOk<T>(request, response);
  }

  // Second 401 (or a failed refresh): the session is unrecoverable.
  await clearSessionCookies();
  throw new HttpError("unauthorized", 401, "Your session has expired. Please sign in again.");
}

async function rotateOrGiveUp(): Promise<boolean> {
  if (await refreshTokens()) return Boolean(await readCookie(ACCESS_COOKIE));
  return false;
}

async function safeFetch(
  request: UpstreamRequest,
  url: string,
  accessToken: string | null,
): Promise<Response> {
  try {
    return await fetch(url, requestInit(request, accessToken));
  } catch (error) {
    const isTimeout =
      error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    if (isTimeout) throw new HttpError("timeout", 504, "The upstream request timed out.");
    if (getServerEnv().API_DEBUG) console.error("[upstream] request failed:", error);
    throw new HttpError("upstream", 502, "Cannot reach the upstream service.");
  }
}

/** Parse a successful upstream response into JSON (or text for non-JSON bodies). */
async function assertOk<T>(
  request: UpstreamRequest,
  response: Response,
): Promise<UpstreamResult<T>> {
  if (!response.ok) {
    const body = await safeJson(response);
    if (getServerEnv().API_DEBUG) console.error("[upstream] error body:", body);
    const code = codeForUpstreamStatus(response.status);
    throw new HttpError(
      code,
      response.status,
      // Ownership/role violations are masked as 404 upstream and must read as
      // a plain "Not found." to the browser.
      code === "not_found" ? "Not found." : messageFromUpstream(body, ""),
    );
  }

  if (response.status === 204 || request.method === "DELETE") {
    return { data: undefined as T, status: response.status, headers: response.headers };
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    return { data: text as unknown as T, status: response.status, headers: response.headers };
  }

  return { data: (await response.json()) as T, status: response.status, headers: response.headers };
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

/**
 * Read a session cookie from the current request. Exported for
 * `upstream-stream.ts`, which must resolve the access cookie the same way.
 */
export async function readCookie(name: string): Promise<string | null> {
  return (await cookies()).get(name)?.value ?? null;
}
