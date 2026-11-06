import { unauthorized } from "./errors";

/**
 * Shared bits of the public widget BFF (`src/app/api/public/embed/**`).
 *
 * These routes are ANONYMOUS: they never read or write the app's `at`/`rt`
 * cookies and always call upstream with `anonymous: true`. A conversation is
 * authorized solely by the visitor's own `Authorization: Bearer <token>`,
 * which the widget keeps in memory and which is forwarded verbatim.
 */

const BEARER_RE = /^Bearer\s+([A-Za-z0-9._~+/=-]{1,4096})$/i;

/** The visitor's conversation token header, or a 401 when absent/malformed. */
export function requireVisitorBearer(request: Request): string {
  const match = BEARER_RE.exec(request.headers.get("authorization")?.trim() ?? "");
  if (!match) throw unauthorized("A conversation token is required.");
  return `Bearer ${match[1]}`;
}

/**
 * Pass the visitor's client IP hints through, so upstream per-visitor rate
 * limits do not collapse onto the BFF host's address.
 */
export function forwardedClientHeaders(request: Request): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const name of ["x-forwarded-for", "x-real-ip", "user-agent"]) {
    const value = request.headers.get(name);
    if (value) headers[name] = value;
  }
  return headers;
}

/** `request.json()` that yields `undefined` for an empty/invalid body. */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
