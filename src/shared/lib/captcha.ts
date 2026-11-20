/**
 * Self-hosted captcha: shared constants and validators (client + server).
 * The site key "app" is this application's own forms (signup).
 */

export const FIRST_PARTY_CAPTCHA_KEY = "app";

const SITE_KEY_RE = /^(app|cs_[A-Za-z0-9_-]{8,64})$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidCaptchaSiteKey(value: unknown): value is string {
  return typeof value === "string" && SITE_KEY_RE.test(value);
}

export function isValidChallengeId(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/** `/captcha/{siteKey}` (one segment, optional trailing slash) → the key, else null. */
export function captchaPageKey(pathname: string): string | null {
  const match = /^\/captcha\/([^/]+)\/?$/.exec(pathname);
  if (!match) return null;
  try {
    const key = decodeURIComponent(match[1] ?? "");
    return isValidCaptchaSiteKey(key) ? key : null;
  } catch {
    return null;
  }
}

/** Public captcha surface: the loader script and the iframe page. */
export function isPublicCaptchaPath(pathname: string): boolean {
  return pathname === "/captcha.js" || pathname.startsWith("/captcha/");
}

/** Message the iframe posts to the host page (read by public/captcha.js). */
export interface CaptchaFrameMessage {
  type: "aa-captcha";
  frame: string;
  event: "solved" | "expired" | "resize";
  token?: string;
  height?: number;
}
