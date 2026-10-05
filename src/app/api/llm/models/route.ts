import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * LLM models (.agent/API.md #25-#26, upstream #25-#26).
 *
 * GET accepts the optional `providerId` filter. Costs are per-million-token
 * DECIMALs upstream, serialized as JSON strings, so they are parsed as
 * numbers in the module schema (see modules/llm/schemas.ts).
 */

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const providerId = new URL(request.url).searchParams.get("providerId");
    const { data } = await callUpstream<unknown>({
      path: "/llm/models",
      query: { provider_id: providerId || undefined },
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

const COST_FIELDS = ["input_cost_per_million", "output_cost_per_million"] as const;

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const record = (body ?? {}) as Record<string, unknown>;

    const providerId = record.provider_id;
    if (typeof providerId !== "string" || !providerId.trim()) {
      throw badRequest("A provider id is required.");
    }
    const name = record.name;
    if (typeof name !== "string" || !name.trim()) throw badRequest("A model name is required.");

    const payload: Record<string, unknown> = {
      provider_id: providerId.trim(),
      name: name.trim(),
    };

    for (const field of COST_FIELDS) {
      const value = record[field];
      if (value === undefined || value === null) continue;
      const parsed = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw badRequest(`\`${field}\` must be a non-negative number.`);
      }
      payload[field] = parsed;
    }

    if (typeof record.display_name === "string" && record.display_name.trim()) {
      payload.display_name = record.display_name.trim();
    }

    for (const field of ["context_window", "max_output_tokens"] as const) {
      const value = record[field];
      if (value === undefined || value === null) continue;
      const parsed = typeof value === "number" ? value : Number(value);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw badRequest(`\`${field}\` must be a positive whole number.`);
      }
      payload[field] = parsed;
    }

    if (typeof record.is_active === "boolean") payload.is_active = record.is_active;

    const { data } = await callUpstream<unknown>({
      path: "/llm/models",
      method: "POST",
      body: payload,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
