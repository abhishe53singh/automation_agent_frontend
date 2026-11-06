import { NextResponse } from "next/server";

import { readJsonObject, requireUuid } from "@/app/api/embed-widgets/_lib/guards";
import { toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * Website chat widgets (owner side).
 * GET — list a project's widgets (`?project_id=`); POST — create a widget.
 */

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const projectId = requireUuid(
      new URL(request.url).searchParams.get("project_id"),
      "project_id",
    );
    const { data } = await callUpstream<unknown>({
      path: "/embed-widgets",
      query: { project_id: projectId },
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await readJsonObject(request);
    requireUuid(typeof body.project_id === "string" ? body.project_id : null, "project_id");
    const { data } = await callUpstream<unknown>({
      path: "/embed-widgets",
      method: "POST",
      body,
      timeoutMs: 15_000,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
