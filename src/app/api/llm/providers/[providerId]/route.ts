import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { toRestrictConflict } from "@/server/restrict-conflict";
import { callUpstream } from "@/server/upstream";

/**
 * A single LLM provider (.agent/API.md #22-#24, upstream #22-#24).
 *
 * DELETE is the RESTRICT-FK case: a provider whose models are referenced by
 * chat history cannot be removed. `toRestrictConflict` turns the backend's
 * 500 IntegrityError into 409 `error.conflict` so the UI can say "in use by
 * chat history" instead of "server error".
 */

const OPTIONAL_FIELDS = ["display_name", "base_url", "api_key_env", "is_active"] as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ providerId: string }> },
): Promise<NextResponse> {
  try {
    const { providerId } = await params;
    if (!providerId) throw badRequest("A provider id is required.");

    const { data } = await callUpstream<unknown>({
      path: `/llm/providers/${encodeURIComponent(providerId)}`,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ providerId: string }> },
): Promise<NextResponse> {
  try {
    const { providerId } = await params;
    if (!providerId) throw badRequest("A provider id is required.");

    const body: unknown = await request.json();
    const record = (body ?? {}) as Record<string, unknown>;
    const payload: Record<string, unknown> = {};

    // `name` is the provider's identity and is not patchable upstream.
    for (const field of OPTIONAL_FIELDS) {
      const value = record[field];
      if (value === undefined) continue;
      if (value === null) {
        if (field === "is_active") throw badRequest("`is_active` cannot be null.");
        payload[field] = null;
        continue;
      }
      if (typeof value !== "string" && typeof value !== "boolean") {
        throw badRequest(`\`${field}\` has an invalid type.`);
      }
      payload[field] = typeof value === "string" ? value.trim() || null : value;
    }

    if (Object.keys(payload).length === 0) {
      throw badRequest("Send at least one field to update.");
    }

    const { data } = await callUpstream<unknown>({
      path: `/llm/providers/${encodeURIComponent(providerId)}`,
      method: "PATCH",
      body: payload,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ providerId: string }> },
): Promise<NextResponse> {
  try {
    const { providerId } = await params;
    if (!providerId) throw badRequest("A provider id is required.");

    await callUpstream({
      path: `/llm/providers/${encodeURIComponent(providerId)}`,
      method: "DELETE",
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(
      toRestrictConflict(error, "This provider is in use by existing chat history."),
    );
  }
}
