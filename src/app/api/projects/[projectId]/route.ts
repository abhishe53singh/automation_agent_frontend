import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * Single project (.agent/API.md #13-#15, upstream #13-#15).
 *
 * All three verbs are thin. The important pass-through rule lives in
 * `callUpstream`: an insufficient role is MASKED upstream as 404, and the BFF
 * renders that as error.not_found / "Not found." — never a 403 that would
 * disclose the project exists.
 */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
): Promise<NextResponse> {
  try {
    const { projectId } = await params;
    if (!projectId) throw badRequest("A project id is required.");

    const { data } = await callUpstream<unknown>({
      path: `/projects/${encodeURIComponent(projectId)}`,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
): Promise<NextResponse> {
  try {
    const { projectId } = await params;
    if (!projectId) throw badRequest("A project id is required.");

    const body: unknown = await request.json();
    const record = (body ?? {}) as Record<string, unknown>;
    const payload: Record<string, unknown> = {};

    // Partial update: only the fields actually sent are forwarded. An explicit
    // `null` clears a nullable field upstream; `undefined` means "leave alone"
    // and is dropped here so it never reaches the backend as null.
    for (const field of ["name", "description", "instructions"] as const) {
      const value = record[field];
      if (value === undefined) continue;
      if (value === null) {
        if (field === "name") throw badRequest("The project name cannot be cleared.");
        payload[field] = null;
        continue;
      }
      if (typeof value !== "string") throw badRequest(`\`${field}\` must be a string or null.`);
      payload[field] = value;
    }

    if (typeof payload.name === "string") {
      const name = payload.name.trim();
      if (!name) throw badRequest("The project name cannot be empty.");
      if (name.length > 150) throw badRequest("The project name must be 150 characters or fewer.");
      payload.name = name;
    }

    if (Object.keys(payload).length === 0) {
      throw badRequest("Send at least one of `name`, `description` or `instructions`.");
    }

    const { data } = await callUpstream<unknown>({
      path: `/projects/${encodeURIComponent(projectId)}`,
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
  { params }: { params: Promise<{ projectId: string }> },
): Promise<NextResponse> {
  try {
    const { projectId } = await params;
    if (!projectId) throw badRequest("A project id is required.");

    await callUpstream({
      path: `/projects/${encodeURIComponent(projectId)}`,
      method: "DELETE",
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
