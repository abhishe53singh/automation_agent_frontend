import { NextResponse } from "next/server";

import { upstreamBaseUrl } from "@/server/session";

/**
 * GET /api/health (.agent/API.md #1). Always 200 so a liveness probe is not
 * coupled to the backend: `upstream` reports whether the ping succeeded.
 */
export async function GET(): Promise<NextResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2_000);
  try {
    const response = await fetch(`${upstreamBaseUrl()}/`, {
      cache: "no-store",
      signal: controller.signal,
    });
    return NextResponse.json({ status: "ok", upstream: response.ok ? "ok" : "down" });
  } catch {
    return NextResponse.json({ status: "ok", upstream: "down" });
  } finally {
    clearTimeout(timer);
  }
}
