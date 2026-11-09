import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * POST /api/integrations/import { password, bundle } — decrypt an export file
 * and add/update the integrations on this account (never duplicates).
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      password?: unknown;
      bundle?: unknown;
    };
    if (typeof body.password !== "string" || !body.password) {
      throw badRequest("A password is required.");
    }
    if (!body.bundle || typeof body.bundle !== "object" || Array.isArray(body.bundle)) {
      throw badRequest("Choose an export file to import.");
    }
    const { data } = await callUpstream<unknown>({
      path: "/integrations/import",
      method: "POST",
      body: { password: body.password, bundle: body.bundle },
      timeoutMs: 30_000,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
