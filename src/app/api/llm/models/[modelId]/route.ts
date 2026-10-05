import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { toRestrictConflict } from "@/server/restrict-conflict";
import { callUpstream } from "@/server/upstream";

/**
 * A single LLM model (.agent/API.md #27-#29, upstream #27-#29).
 *
 * `name` and `provider_id` are identity fields and are not patchable upstream.
 * DELETE hits the same RESTRICT FK as a provider: a model with chat response
 * history answers 409 `error.conflict` (item 25).
 */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ modelId: string }> },
): Promise<NextResponse> {
  try {
    const { modelId } = await params;
    if (!modelId) throw badRequest("A model id is required.");

    const { data } = await callUpstream<unknown>({
      path: `/llm/models/${encodeURIComponent(modelId)}`,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ modelId: string }> },
): Promise<NextResponse> {
  try {
    const { modelId } = await params;
    if (!modelId) throw badRequest("A model id is required.");

    const body: unknown = await request.json();
    const record = (body ?? {}) as Record<string, unknown>;
    const payload: Record<string, unknown> = {};

    for (const field of ["input_cost_per_million", "output_cost_per_million"] as const) {
      const value = record[field];
      if (value === undefined) continue;
      const parsed = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw badRequest(`\`${field}\` must be a non-negative number.`);
      }
      payload[field] = parsed;
    }

    for (const field of ["context_window", "max_output_tokens"] as const) {
      const value = record[field];
      if (value === undefined) continue;
      if (value === null) {
        payload[field] = null;
        continue;
      }
      const parsed = typeof value === "number" ? value : Number(value);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw badRequest(`\`${field}\` must be a positive whole number.`);
      }
      payload[field] = parsed;
    }

    if (record.display_name === null) {
      payload.display_name = null;
    } else if (typeof record.display_name === "string") {
      payload.display_name = record.display_name.trim() || null;
    }

    if (typeof record.is_active === "boolean") payload.is_active = record.is_active;

    if (Object.keys(payload).length === 0) {
      throw badRequest("Send at least one field to update.");
    }

    const { data } = await callUpstream<unknown>({
      path: `/llm/models/${encodeURIComponent(modelId)}`,
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
  { params }: { params: Promise<{ modelId: string }> },
): Promise<NextResponse> {
  try {
    const { modelId } = await params;
    if (!modelId) throw badRequest("A model id is required.");

    await callUpstream({ path: `/llm/models/${encodeURIComponent(modelId)}`, method: "DELETE" });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(
      toRestrictConflict(error, "This model is in use by existing chat history."),
    );
  }
}
