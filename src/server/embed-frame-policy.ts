import { getServerEnv } from "@/config/env";
import { buildFrameAncestors } from "@/shared/lib/embed-widget";

/**
 * `frame-ancestors` policy for `/embed/{publicKey}` pages, resolved from the
 * widget's public config and cached in-memory per key.
 *
 * Used by `src/proxy.ts`, so this module must NOT import `next/headers` or
 * anything that touches the session (it only needs the backend base URL).
 */

const CACHE_TTL_MS = 60_000;
const FETCH_TIMEOUT_MS = 3_000;
const MAX_ENTRIES = 1_000;

interface CacheEntry {
  policy: string;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

/** Test hook. */
export function clearFramePolicyCache(): void {
  cache.clear();
}

/**
 * Allowed origins for a widget: the list, or `null` when the widget is unknown,
 * inactive or the config is unreadable. Transport failures throw so they are
 * not cached.
 */
async function fetchAllowedOrigins(configPath: string): Promise<string[] | null> {
  const base = getServerEnv().API_BASE_URL.replace(/\/+$/, "");
  const response = await fetch(`${base}${configPath}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (response.status >= 500) throw new Error(`config upstream ${response.status}`);
  if (!response.ok) return null;
  const body = (await response.json().catch(() => null)) as { allowed_origins?: unknown } | null;
  const origins = body?.allowed_origins;
  if (!Array.isArray(origins)) return null;
  return origins.filter((value): value is string => typeof value === "string");
}

async function cachedPolicy(configPath: string, now: number): Promise<string> {
  const hit = cache.get(configPath);
  if (hit && hit.expiresAt > now) return hit.policy;

  let policy: string;
  try {
    policy = buildFrameAncestors(await fetchAllowedOrigins(configPath));
  } catch {
    // Backend unreachable: fail closed, but do not cache the outage.
    return buildFrameAncestors(null);
  }

  if (cache.size >= MAX_ENTRIES) cache.clear();
  cache.set(configPath, { policy, expiresAt: now + CACHE_TTL_MS });
  return policy;
}

/** `/embed/{publicKey}` (chat widget). */
export function framePolicyForKey(publicKey: string, now = Date.now()): Promise<string> {
  return cachedPolicy(`/public/embed/${encodeURIComponent(publicKey)}/config`, now);
}

/** `/captcha/{siteKey}` (captcha iframe): the captcha site's allowed websites. */
export function framePolicyForCaptchaKey(siteKey: string, now = Date.now()): Promise<string> {
  return cachedPolicy(`/public/captcha/${encodeURIComponent(siteKey)}/config`, now);
}
