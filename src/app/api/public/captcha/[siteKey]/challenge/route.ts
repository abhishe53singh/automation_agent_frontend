import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { forwardedClientHeaders, readJsonBody } from "@/server/public-embed";
import { callUpstream } from "@/server/upstream";
import { isValidCaptchaSiteKey } from "@/shared/lib/captcha";
import { normalizeOrigin } from "@/shared/lib/embed-widget";

/**
 * New captcha image for a site ("app" = this app's signup). Anonymous.
 * Answers `{challenge_id, image, expires_at, length}`; upstream answers 403
 * when `parent_origin` is not allowed for the site and 429 when rate limited.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ siteKey: string }> },
): Promise<NextResponse> {
  try {
    const { siteKey } = await params;
    if (!isValidCaptchaSiteKey(siteKey)) throw badRequest("Invalid captcha site key.");

    const body = await readJsonBody(request);
    const raw =
      body && typeof body === "object" && !Array.isArray(body)
        ? (body as { parent_origin?: unknown }).parent_origin
        : undefined;
    const origin = typeof raw === "string" ? normalizeOrigin(raw.trim()) : null;

    const { data } = await callUpstream<unknown>({
      path: `/public/captcha/${encodeURIComponent(siteKey)}/challenge`,
      method: "POST",
      body: origin ? { parent_origin: origin } : {},
      anonymous: true,
      headers: forwardedClientHeaders(request),
    });
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
