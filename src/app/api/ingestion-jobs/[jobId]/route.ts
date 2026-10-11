import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/** Single ingestion job (upstream #53) — polled while non-terminal. */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
): Promise<NextResponse> {
  try {
    const { jobId } = await params;
    if (!jobId) throw badRequest("A job id is required.");
    const { data } = await callUpstream<unknown>({
      path: `/ingestion-jobs/${encodeURIComponent(jobId)}`,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
