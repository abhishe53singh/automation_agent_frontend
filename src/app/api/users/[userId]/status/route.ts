import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * PATCH /api/users/{userId}/status (.agent/API.md #10) — upstream #10.
 *
 * Admin-only: upstream 403 for a non-ADMIN_EMAILS caller (including when the
 * allowlist is unconfigured), 400 when changing your own status, 404 unknown.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
): Promise<NextResponse> {
  try {
    const { userId } = await params;
    if (!userId) throw badRequest("A user id is required.");

    const body: unknown = await request.json();
    const { is_active: isActive } = (body ?? {}) as Record<string, unknown>;
    if (typeof isActive !== "boolean") {
      throw badRequest("`is_active` must be a boolean.");
    }

    const { data } = await callUpstream<unknown>({
      path: `/users/${encodeURIComponent(userId)}/status`,
      method: "PATCH",
      body: { is_active: isActive },
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
