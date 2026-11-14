import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * DELETE /api/llm/providers/{id}/permanent — remove a record that is already in
 * the Deleted tab for good (upstream refuses anything else with 409).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ providerId: string }> },
): Promise<NextResponse> {
  try {
    const { providerId: recordId } = await params;
    if (!recordId) throw badRequest("An id is required.");
    const { data } = await callUpstream<unknown>({
      path: `/llm/providers/${encodeURIComponent(recordId)}/permanent`,
      method: "DELETE",
      timeoutMs: 30_000,
    });
    return NextResponse.json(data ?? {});
  } catch (error) {
    return toErrorResponse(error);
  }
}
