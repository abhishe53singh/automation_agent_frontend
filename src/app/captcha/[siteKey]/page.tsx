import { notFound } from "next/navigation";

import { CaptchaFrame } from "@/modules/captcha/components/CaptchaFrame";
import { isValidCaptchaSiteKey } from "@/shared/lib/captcha";
import { normalizeOrigin } from "@/shared/lib/embed-widget";

/**
 * /captcha/{siteKey}?origin=https://host.example&frame=<id>
 *
 * Loaded in an iframe by public/captcha.js. The page's framing is limited to
 * the site's allowed websites by a `frame-ancestors` CSP (src/proxy.ts), and
 * the solved token is posted only to `origin`.
 */
export default async function CaptchaFramePage({
  params,
  searchParams,
}: {
  params: Promise<{ siteKey: string }>;
  searchParams: Promise<{ origin?: string | string[]; frame?: string | string[] }>;
}) {
  const { siteKey } = await params;
  const query = await searchParams;
  if (!isValidCaptchaSiteKey(siteKey)) notFound();

  const first = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);
  const origin = normalizeOrigin(first(query.origin) ?? null);
  const frame = (first(query.frame) ?? "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);

  return <CaptchaFrame siteKey={siteKey} parentOrigin={origin} frameId={frame} />;
}
