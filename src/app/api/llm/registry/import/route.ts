import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * POST /api/llm/registry/import { password, bundle } — restore providers and
 * models from a backup made by /api/llm/registry/export. Matching records are
 * updated, missing ones created; nothing is deleted.
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
      throw badRequest("Choose the backup file to import.");
    }
    const { data } = await callUpstream<unknown>({
      path: "/llm/registry/import",
      method: "POST",
      body: { password: body.password, bundle: body.bundle },
      timeoutMs: 60_000,
    });
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
