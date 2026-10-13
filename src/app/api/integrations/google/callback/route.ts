import { NextResponse } from "next/server";

import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * Google OAuth callback (phase_6.txt item 50).
 * GET — exchange authorization code and persist encrypted connection.
 */

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const params = new URL(request.url).searchParams;
    const { data } = await callUpstream<unknown>({
      path: "/integrations/google/callback",
      query: {
        code: params.get("code") || undefined,
        state: params.get("state") || undefined,
      },
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

