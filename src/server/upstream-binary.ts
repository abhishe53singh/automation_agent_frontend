import { HttpError, codeForUpstreamStatus, messageFromUpstream } from "./errors";
import { refreshTokens, readCookie } from "./upstream";
import { ACCESS_COOKIE, clearSessionCookies, upstreamBaseUrl } from "./session";

/**
 * Raw binary proxy for file downloads (mirrors `upstream-stream.ts` for SSE).
 *
 * `callUpstream` parses every body as JSON, which would corrupt bytes. This
 * hands back the untouched `Response` so the route streams it verbatim with
 * Content-Disposition + content type preserved. 410 Gone (bytes missing from
 * disk) maps to error code "gone"; 404 stays masked as "not_found".
 */

export interface UpstreamBinaryOptions {
  path: string;
}

export async function openUpstreamBinary(options: UpstreamBinaryOptions): Promise<Response> {
  const url = `${upstreamBaseUrl()}${options.path}`;

  const send = (token: string) =>
    fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      redirect: "follow",
    });

  let accessToken = await readCookie(ACCESS_COOKIE);
  if (!accessToken) {
    if (!(await refreshTokens())) throw new HttpError("unauthorized", 401, "Not signed in.");
    accessToken = await readCookie(ACCESS_COOKIE);
    if (!accessToken) throw new HttpError("unauthorized", 401, "Not signed in.");
  }

  let response = await safeBinary(send, accessToken);
  if (response.status !== 401) return assertBinaryOk(response);

  if (await refreshTokens()) {
    const rotated = await readCookie(ACCESS_COOKIE);
    if (rotated) {
      response = await safeBinary(send, rotated);
      if (response.status !== 401) return assertBinaryOk(response);
    }
  }

  await clearSessionCookies();
  throw new HttpError("unauthorized", 401, "Your session has expired. Please sign in again.");
}

async function safeBinary(
  send: (token: string) => Promise<Response>,
  token: string,
): Promise<Response> {
  try {
    return await send(token);
  } catch {
    throw new HttpError("upstream", 502, "Cannot reach the upstream service.");
  }
}

async function assertBinaryOk(response: Response): Promise<Response> {
  if (response.ok) return response;

  // 410 needs its own wording ("no longer available"), not "Not found".
  if (response.status === 410) {
    throw new HttpError("gone", 410, "This file is no longer available.");
  }
  const code = codeForUpstreamStatus(response.status);
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }
  throw new HttpError(
    code,
    response.status,
    code === "not_found" ? "Not found." : messageFromUpstream(body, ""),
  );
}
