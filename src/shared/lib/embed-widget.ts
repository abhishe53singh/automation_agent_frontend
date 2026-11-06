/**
 * Pure helpers for the public, embeddable chat widget (`/embed/{publicKey}`,
 * `/api/public/embed/**`, `public/embed.js`).
 *
 * Dependency-free on purpose: it is imported by the proxy, by the public BFF
 * routes and by the client widget alike.
 */

/** Public widget keys look like `wk_…`; accept a conservative token shape. */
const PUBLIC_KEY_RE = /^[A-Za-z0-9_-]{3,128}$/;
/** Conversation ids are opaque (UUIDs today); same conservative shape. */
const CONVERSATION_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

export const EMBED_MESSAGE_MAX_CHARS = 4000;
export const EMBED_CLOSE_MESSAGE_TYPE = "agent-widget:close";

export function isValidPublicKey(value: unknown): value is string {
  return typeof value === "string" && PUBLIC_KEY_RE.test(value);
}

export function isValidConversationId(value: unknown): value is string {
  return typeof value === "string" && CONVERSATION_ID_RE.test(value);
}

/** `/embed/{publicKey}` (one segment, optional trailing slash) → the key, else null. */
export function embedPageKey(pathname: string): string | null {
  const match = /^\/embed\/([^/]+)\/?$/.exec(pathname);
  if (!match) return null;
  let key: string;
  try {
    key = decodeURIComponent(match[1] ?? "");
  } catch {
    return null;
  }
  return isValidPublicKey(key) ? key : null;
}

/** Paths that are public by design and must never bounce to /login. */
export function isPublicEmbedPath(pathname: string): boolean {
  return (
    pathname === "/embed.js" ||
    pathname === "/embed" ||
    pathname.startsWith("/embed/") ||
    pathname === "/api/public" ||
    pathname.startsWith("/api/public/")
  );
}

/**
 * A CSP host-source for one allowed origin, or null when the value cannot be
 * expressed safely. Anything containing whitespace, `;`, `,` or quotes would
 * let a stored value inject extra directives, so only scheme://host[:port]
 * (optionally with a leading `*.` wildcard label) is accepted.
 */
export function toFrameAncestorSource(origin: string): string | null {
  const value = origin.trim().replace(/\/+$/, "");
  const match = /^(https?):\/\/(\*\.)?([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*)(:\d{1,5})?$/.exec(value);
  if (!match) return null;
  const [, scheme, wildcard = "", host, port = ""] = match;
  return `${scheme!.toLowerCase()}://${wildcard}${host!.toLowerCase()}${port}`;
}

/**
 * The `Content-Security-Policy` value for an `/embed/{key}` response.
 *
 * - `null` (unknown / inactive widget, or the config could not be fetched)
 *   → `frame-ancestors 'none'` (fail closed)
 * - empty list → `frame-ancestors *` (embeddable anywhere)
 * - otherwise → `'self'` (the owner's in-app preview) plus each valid origin;
 *   if none survives validation it fails closed as well.
 */
export function buildFrameAncestors(allowedOrigins: readonly string[] | null): string {
  if (allowedOrigins === null) return "frame-ancestors 'none'";
  if (allowedOrigins.length === 0) return "frame-ancestors *";

  const sources = new Set<string>();
  for (const origin of allowedOrigins) {
    if (typeof origin !== "string") continue;
    const source = toFrameAncestorSource(origin);
    if (source) sources.add(source);
  }
  if (sources.size === 0) return "frame-ancestors 'none'";
  return `frame-ancestors 'self' ${[...sources].join(" ")}`;
}

/** Normalize an origin-ish string (`https://a.com/x` → `https://a.com`), else null. */
export function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Pick a readable foreground (#fff or a near-black) for a `#rgb`/`#rrggbb`
 * accent using WCAG relative luminance. Invalid input → null.
 */
export function parseHexColor(value: string | null | undefined): string | null {
  if (!value) return null;
  const hex = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) return hex.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    const [r, g, b] = hex.slice(1);
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

export function readableTextColor(accent: string): "#ffffff" | "#111827" {
  const hex = parseHexColor(accent) ?? "#2563eb";
  const channel = (offset: number) => {
    const c = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  // Contrast vs white = 1.05 / (L + 0.05); vs #111827 (L≈0.0123) = (L + 0.05) / 0.0623.
  return 1.05 / (luminance + 0.05) >= (luminance + 0.05) / 0.0623 ? "#ffffff" : "#111827";
}
