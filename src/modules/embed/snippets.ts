/**
 * Pure helpers for the website widget UI: origin validation and the embed
 * snippets the owner pastes onto their site. Kept free of React so they are
 * trivially unit-testable.
 */

/** `https://host[:port]` — no path, query, fragment or credentials. */
const ORIGIN_RE =
  /^https:\/\/(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*(?::(\d{1,5}))?$/;

/** Plain http is allowed only for local testing (localhost / 127.0.0.1). */
const LOCAL_HTTP_RE = /^http:\/\/(?:localhost|127\.0\.0\.1)(?::(\d{1,5}))?$/;

export type OriginCheck = { ok: true; origin: string } | { ok: false; error: string };

/**
 * Validate and normalise an allowed-website entry. Trailing slashes are
 * dropped and the host is lower-cased so `https://Shop.example.com/` and
 * `https://shop.example.com` are the same origin.
 */
export function normalizeOrigin(input: string): OriginCheck {
  const value = input.trim().replace(/\/+$/, "").toLowerCase();
  if (!value) return { ok: false, error: "Enter a website address." };
  const local = LOCAL_HTTP_RE.exec(value);
  if (local) {
    const n = local[1] === undefined ? 80 : Number(local[1]);
    if (n < 1 || n > 65535) return { ok: false, error: "Port must be between 1 and 65535." };
    return { ok: true, origin: value.replace(/:80$/, "") };
  }
  if (!value.startsWith("https://")) {
    return {
      ok: false,
      error:
        "Use https:// followed by the host, e.g. https://shop.example.com (http:// is allowed only for localhost testing)",
    };
  }
  const match = ORIGIN_RE.exec(value);
  if (!match) {
    return {
      ok: false,
      error: "Only the site address is allowed: https://host or https://host:port (no paths).",
    };
  }
  const port = match[1];
  if (port !== undefined) {
    const n = Number(port);
    if (n < 1 || n > 65535) return { ok: false, error: "Port must be between 1 and 65535." };
    if (n === 443) return { ok: true, origin: value.replace(/:443$/, "") };
  }
  return { ok: true, origin: value };
}

export function isValidOrigin(input: string): boolean {
  return normalizeOrigin(input).ok;
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export interface EmbedSnippets {
  script: string;
  iframe: string;
  previewUrl: string;
}

/** Build both embed snippets for a widget. `appOrigin` is `window.location.origin`. */
export function buildEmbedSnippets({
  appOrigin,
  publicKey,
  title,
}: {
  appOrigin: string;
  publicKey: string;
  title?: string | null;
}): EmbedSnippets {
  const origin = appOrigin.replace(/\/+$/, "");
  const key = encodeURIComponent(publicKey);
  const frameTitle = escapeAttr(title?.trim() || "Chat");
  return {
    script: `<script src="${origin}/embed.js" data-widget="${escapeAttr(publicKey)}" async></script>`,
    iframe: `<iframe src="${origin}/embed/${key}" title="${frameTitle}" style="width:380px;height:600px;border:0;border-radius:12px" allow="clipboard-write"></iframe>`,
    previewUrl: `/embed/${key}`,
  };
}
