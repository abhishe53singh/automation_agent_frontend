import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { forwardedClientHeaders } from "@/server/public-embed";
import { callUpstream } from "@/server/upstream";
import { isValidPublicKey } from "@/shared/lib/embed-widget";

/**
 * Public widget config (anonymous). 404 for an unknown or inactive widget.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ publicKey: string }> },
): Promise<NextResponse> {
  try {
    const { publicKey } = await params;
    if (!isValidPublicKey(publicKey)) throw badRequest("Invalid widget key.");

    const { data } = await callUpstream<unknown>({
      path: `/public/embed/${encodeURIComponent(publicKey)}/config`,
      anonymous: true,
      headers: forwardedClientHeaders(request),
    });
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
