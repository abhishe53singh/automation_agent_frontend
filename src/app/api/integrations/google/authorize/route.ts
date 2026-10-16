import { NextResponse } from "next/server";

import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * Google OAuth authorize redirect (phase_6.txt item 50).
 * GET — redirect to Google consent screen.
 */

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { data } = await callUpstream<{ authorization_url: string }>({
      path: "/integrations/google/authorize",
      redirect: "manual",
    });
    const authUrl = (data as Record<string, string>).authorization_url;
    if (!authUrl) return NextResponse.json({ error: "No authorization URL returned." }, { status: 502 });

    const accept = request.headers.get("accept") ?? "";
    if (accept.includes("application/json")) {
      return NextResponse.json({ authorization_url: authUrl });
    }
    return NextResponse.redirect(authUrl);
  } catch (error) {
    return toErrorResponse(error);
  }
}

