import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * A single project member (.agent/API.md #18-#19, upstream #18-#19).
 *
 * PATCH  -> change the role. Upstream 400 (owner row) -> error.validation.
 * DELETE -> 204. Upstream 400 (owner row) -> error.validation.
 * A member id from another project is masked as 404 -> "Not found."
 */

const ASSIGNABLE_ROLES = ["admin", "member", "viewer"] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; memberId: string }> },
): Promise<NextResponse> {
  try {
    const { projectId, memberId } = await params;
    if (!projectId || !memberId) throw badRequest("A project id and member id are required.");

    const body: unknown = await request.json();
    const { role } = (body ?? {}) as Record<string, unknown>;
    if (role === "owner") {
      throw badRequest("The owner's role cannot be changed.");
    }
    if (!(ASSIGNABLE_ROLES as readonly unknown[]).includes(role)) {
      throw badRequest("`role` must be one of admin, member or viewer.");
    }

    const { data } = await callUpstream<unknown>({
      path: `/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(memberId)}`,
      method: "PATCH",
      body: { role },
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; memberId: string }> },
): Promise<NextResponse> {
  try {
    const { projectId, memberId } = await params;
    if (!projectId || !memberId) throw badRequest("A project id and member id are required.");

    await callUpstream({
      path: `/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(memberId)}`,
      method: "DELETE",
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
