import { badRequest } from "@/server/errors";

/**
 * Minimal input guards for the owner-side embed-widget BFF routes. The backend
 * does the real validation (422s come back through the error envelope); these
 * only stop obviously malformed ids and bodies from leaving the BFF.
 */

const ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requireId(value: string | undefined | null, label = "id"): string {
  if (!value || !ID_RE.test(value)) throw badRequest(`Invalid ${label}.`);
  return value;
}

export function requireUuid(value: string | undefined | null, label: string): string {
  if (!value || !UUID_RE.test(value)) throw badRequest(`Invalid ${label}.`);
  return value;
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw badRequest("Request body must be JSON.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw badRequest("Request body must be a JSON object.");
  }
  return body as Record<string, unknown>;
}

export function boundedInt(
  raw: string | null,
  { min, max }: { min: number; max: number },
): number | undefined {
  if (raw === null || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) throw badRequest("Invalid pagination value.");
  return n;
}
