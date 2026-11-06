import { NextResponse } from "next/server";

import { callUpstream } from "@/server/upstream";

/**
 * Google OAuth callback (phase_6.txt item 50).
 * GET — Google redirects the browser here. The code is exchanged upstream
 * (which persists the encrypted connection), then the browser is sent back to
 * the Integrations page with `?google=connected` or `?google=error&message=…`
 * so the UI can show the outcome instead of raw JSON.
 */

const RETURN_PATH = "/integrations";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const params = url.searchParams;
  const target = new URL(RETURN_PATH, url.origin);

  try {
    await callUpstream<unknown>({
      path: "/integrations/google/callback",
      query: {
        code: params.get("code") || undefined,
        state: params.get("state") || undefined,
        // Set by Google when the user cancels the consent screen.
        error: params.get("error") || undefined,
      },
    });
    target.searchParams.set("google", "connected");
  } catch (error) {
    target.searchParams.set("google", "error");
    target.searchParams.set(
      "message",
      error instanceof Error && error.message ? error.message : "Google connection failed.",
    );
  }

  return NextResponse.redirect(target);
}
