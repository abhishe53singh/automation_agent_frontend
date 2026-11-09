import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * POST /api/integrations/export { password } — the user's Google connection(s)
 * and MCP servers/tools as a password-encrypted bundle (upstream encrypts with
 * scrypt + AES-256-GCM; see backend app/core/bundle_crypto.py). The password
 * is only forwarded, never logged or stored.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json().catch(() => ({}))) as { password?: unknown };
    if (typeof body.password !== "string" || !body.password) {
      throw badRequest("A password is required.");
    }
    const { data } = await callUpstream<unknown>({
      path: "/integrations/export",
      method: "POST",
      body: { password: body.password },
      // Key derivation is deliberately slow.
      timeoutMs: 30_000,
    });
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
