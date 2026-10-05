import { getServerEnv } from "@/config/env";
import { HttpError, codeForUpstreamStatus, messageFromUpstream } from "./errors";
import { refreshTokens, readCookie } from "./upstream";
import { ACCESS_COOKIE, clearSessionCookies, upstreamBaseUrl } from "./session";

/**
 * Raw streaming proxy for server-sent events (.agent/phase_4.txt item 29).
 *
 * `callUpstream` buffers the whole body before returning, which would defeat
 * SSE entirely — a browser would see nothing until the stream ended. This
 * function hands back the untouched `Response` (and its `ReadableStream`) so
 * the route can pipe bytes straight through, and it is the ONE place besides
 * `callUpstream` that knows the upstream host.
 *
 * Guarantees:
 *   - refresh-on-401 happens BEFORE the stream opens (a 401 arrives as a normal
 *     response, so the caller can still turn it into an error envelope)
 *   - no timeout is applied: the upstream stream has its own 300 s cap
 *   - the returned `Response.body` is the upstream body, so cancelling the
 *     client connection aborts the upstream fetch
 */

export interface UpstreamStreamOptions {
  path: string;
  /** Extra headers merged after Accept (e.g. Last-Event-ID). */
  headers?: Record<string, string>;
}

export async function openUpstreamStream(options: UpstreamStreamOptions): Promise<Response> {
  const { path, headers = {} } = options;
  const url = `${upstreamBaseUrl()}${path}`;

  const send = (token: string) =>
    fetch(url, {
      method: "GET",
      headers: { Accept: "text/event-stream", Authorization: `Bearer ${token}`, ...headers },
      cache: "no-store",
      // No signal: the caller's request-signal cancellation is forwarded by
      // the route, which aborts this fetch when the client goes away.
      redirect: "follow",
    });

  let accessToken = await readCookie(ACCESS_COOKIE);
  if (!accessToken) {
    if (!(await refreshTokens())) throw new HttpError("unauthorized", 401, "Not signed in.");
    accessToken = await readCookie(ACCESS_COOKIE);
    if (!accessToken) throw new HttpError("unauthorized", 401, "Not signed in.");
  }

  let response = await safeStream(send, accessToken);

  if (response.status !== 401) return assertStreamOk(response);

  // Rotate once, then retry — a stream must not start on a dead token.
  if (await refreshTokens()) {
    const rotated = await readCookie(ACCESS_COOKIE);
    if (rotated) {
      response = await safeStream(send, rotated);
      if (response.status !== 401) return assertStreamOk(response);
    }
  }

  await clearSessionCookies();
  throw new HttpError("unauthorized", 401, "Your session has expired. Please sign in again.");
}

async function safeStream(send: (token: string) => Promise<Response>, token: string) {
  try {
    return await send(token);
  } catch (error) {
    if (getServerEnv().API_DEBUG) console.error("[upstream] stream request failed:", error);
    throw new HttpError("upstream", 502, "Cannot reach the upstream service.");
  }
}

/** Convert a non-2xx streaming response into the normal error envelope. */
async function assertStreamOk(response: Response): Promise<Response> {
  if (response.ok) return response;

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }
  const code = codeForUpstreamStatus(response.status);
  throw new HttpError(
    code,
    response.status,
    // Reuse the 404 mask so an inaccessible session/turn never leaks existence.
    code === "not_found" ? "Not found." : messageFromUpstream(body, ""),
  );
}
