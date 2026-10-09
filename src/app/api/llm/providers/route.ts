import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * LLM providers (.agent/API.md #20-#21, upstream #20-#21).
 *
 * `api_key` is accepted here and stored in the DB by the backend. Responses
 * never echo it back — they carry only the safe `has_api_key` boolean (plus
 * the legacy `api_key_env` env-var name).
 */

export async function GET(): Promise<NextResponse> {
  try {
    const { data } = await callUpstream<unknown>({ path: "/llm/providers" });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const {
      name,
      display_name: displayName,
      base_url: baseUrl,
      api_key: apiKey,
      api_key_env: apiKeyEnv,
      is_active: isActive,
    } = (body ?? {}) as Record<string, unknown>;

    if (typeof name !== "string" || !name.trim()) throw badRequest("A provider name is required.");
    if (displayName !== undefined && displayName !== null && typeof displayName !== "string") {
      throw badRequest("`display_name` must be a string.");
    }
    if (baseUrl !== undefined && baseUrl !== null && typeof baseUrl !== "string") {
      throw badRequest("`base_url` must be a string.");
    }
    if (apiKey !== undefined && apiKey !== null && typeof apiKey !== "string") {
      throw badRequest("`api_key` must be a string.");
    }
    if (apiKeyEnv !== undefined && apiKeyEnv !== null && typeof apiKeyEnv !== "string") {
      throw badRequest("`api_key_env` must be a string.");
    }
    if (isActive !== undefined && typeof isActive !== "boolean") {
      throw badRequest("`is_active` must be a boolean.");
    }

    const payload: Record<string, unknown> = { name: name.trim() };
    if (typeof displayName === "string" && displayName.trim())
      payload.display_name = displayName.trim();
    if (typeof baseUrl === "string" && baseUrl.trim()) payload.base_url = baseUrl.trim();
    if (typeof apiKey === "string" && apiKey.trim()) payload.api_key = apiKey.trim();
    if (typeof apiKeyEnv === "string" && apiKeyEnv.trim()) payload.api_key_env = apiKeyEnv.trim();
    if (typeof isActive === "boolean") payload.is_active = isActive;

    const { data } = await callUpstream<unknown>({
      path: "/llm/providers",
      method: "POST",
      body: payload,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
