import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * Project members (.agent/API.md #16-#17, upstream #16-#17).
 *
 * GET  -> `ProjectMemberResponse[]` with the nested `user` object.
 * POST -> 201. The "exactly one of user_id / email" rule is enforced HERE as
 *        well as upstream so the browser gets an immediate, specific
 *        error.validation instead of a generic 422 detail string.
 *        `role: "owner"` is rejected client-side too — ownership is implicit.
 */

const ASSIGNABLE_ROLES = ["admin", "member", "viewer"] as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
): Promise<NextResponse> {
  try {
    const { projectId } = await params;
    if (!projectId) throw badRequest("A project id is required.");

    const { data } = await callUpstream<unknown>({
      path: `/projects/${encodeURIComponent(projectId)}/members`,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
): Promise<NextResponse> {
  try {
    const { projectId } = await params;
    if (!projectId) throw badRequest("A project id is required.");

    const body: unknown = await request.json();
    const { user_id: userId, email, role } = (body ?? {}) as Record<string, unknown>;

    const hasUserId = typeof userId === "string" && userId.trim() !== "";
    const hasEmail = typeof email === "string" && email.trim() !== "";
    if (hasUserId === hasEmail) {
      throw badRequest("Provide exactly one of `user_id` or `email`.");
    }
    if (hasEmail && !String(email).includes("@")) {
      throw badRequest("Enter a valid email address.");
    }
    if (role === "owner") {
      throw badRequest("The owner role cannot be assigned; the creator is always the owner.");
    }
    if (role !== undefined && !(ASSIGNABLE_ROLES as readonly unknown[]).includes(role)) {
      throw badRequest("`role` must be one of admin, member or viewer.");
    }

    const payload: Record<string, unknown> = hasUserId
      ? { user_id: String(userId).trim(), role: role ?? "member" }
      : { email: String(email).trim(), role: role ?? "member" };

    const { data } = await callUpstream<unknown>({
      path: `/projects/${encodeURIComponent(projectId)}/members`,
      method: "POST",
      body: payload,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
