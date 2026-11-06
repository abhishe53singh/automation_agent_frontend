import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { forwardedClientHeaders, readJsonBody } from "@/server/public-embed";
import { callUpstream } from "@/server/upstream";
import { isValidPublicKey, normalizeOrigin } from "@/shared/lib/embed-widget";

/**
 * Start an anonymous widget conversation. Answers 201 with
 * `{conversation_id, token, expires_at, welcome_message}`; upstream answers 403
 * when `parent_origin` is not allowed and 429 when rate limited.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ publicKey: string }> },
): Promise<NextResponse> {
  try {
    const { publicKey } = await params;
    if (!isValidPublicKey(publicKey)) throw badRequest("Invalid widget key.");

    const body = (await readJsonBody(request)) ?? {};
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw badRequest("The request body must be an object.");
    }
    const raw = (body as { parent_origin?: unknown }).parent_origin;
    if (raw !== undefined && raw !== null && typeof raw !== "string") {
      throw badRequest("`parent_origin` must be a string.");
    }

    const payload: Record<string, string> = {};
    if (typeof raw === "string" && raw.trim()) {
      // Pages opened from disk report "null" / "file://". Drop non-web origins
      // instead of failing: a widget open to any site still works, and one
      // restricted to specific sites still gets a 403 from the backend.
      const origin = normalizeOrigin(raw.trim());
      if (origin) payload.parent_origin = origin;
    }

    const { data, status } = await callUpstream<unknown>({
      path: `/public/embed/${encodeURIComponent(publicKey)}/conversations`,
      method: "POST",
      body: payload,
      anonymous: true,
      headers: forwardedClientHeaders(request),
    });
    return NextResponse.json(data, { status: status || 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
