import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * POST /api/llm/providers/{id}/archive | /restore — registry lifecycle.
 * Archive hides it from new chat selection (existing chats keep it); restore
 * moves an archived OR deleted record back to active. Delete is DELETE on
 * the record itself (soft delete upstream).
 */
const ACTIONS = new Set(["archive", "restore"]);

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ providerId: string; action: string }> },
): Promise<NextResponse> {
  try {
    const { providerId: recordId, action } = await params;
    if (!recordId) throw badRequest("An id is required.");
    if (!ACTIONS.has(action)) throw badRequest("Unknown action.");
    const { data } = await callUpstream<unknown>({
      path: `/llm/providers/${encodeURIComponent(recordId)}/${action}`,
      method: "POST",
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
