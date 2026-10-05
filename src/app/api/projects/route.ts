import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * Projects collection (.agent/API.md #11-#12, upstream #11-#12).
 *
 * GET  -> `ProjectResponse[]`, each carrying the CALLER's `role`.
 * POST -> 201 `ProjectResponse`; upstream 422 (name/description limits) and
 *         400 (duplicate name) both arrive as error.validation.
 */

export async function GET(): Promise<NextResponse> {
  try {
    const { data } = await callUpstream<unknown>({ path: "/projects" });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const record = (body ?? {}) as Record<string, unknown>;
    const { name, description, instructions } = record;

    if (typeof name !== "string" || !name.trim()) {
      throw badRequest("A project name is required.");
    }
    if (name.length > 150) throw badRequest("The project name must be 150 characters or fewer.");
    if (description !== undefined && description !== null && typeof description !== "string") {
      throw badRequest("`description` must be a string.");
    }
    if (instructions !== undefined && instructions !== null && typeof instructions !== "string") {
      throw badRequest("`instructions` must be a string.");
    }

    const payload: Record<string, unknown> = { name: name.trim() };
    if (typeof description === "string" && description.trim())
      payload.description = description.trim();
    if (typeof instructions === "string" && instructions.trim()) {
      payload.instructions = instructions.trim();
    }

    const { data } = await callUpstream<unknown>({
      path: "/projects",
      method: "POST",
      body: payload,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
