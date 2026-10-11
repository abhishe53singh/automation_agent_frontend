import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * Ingestion jobs (upstream #51-#53).
 * POST queues ingestion by file id; GET lists history (file/status filters).
 */

const STATUSES = ["pending", "running", "succeeded", "failed", "cancelled"] as const;

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const params = new URL(request.url).searchParams;
    const status = params.get("status");
    if (status && !(STATUSES as readonly string[]).includes(status)) {
      throw badRequest("That job status is not valid.");
    }
    const { data } = await callUpstream<unknown>({
      path: "/ingestion-jobs",
      query: {
        file_id: params.get("fileId") || undefined,
        status: status || undefined,
      },
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const record = (body ?? {}) as Record<string, unknown>;
    if (typeof record.file_id !== "string" || !record.file_id.trim()) {
      throw badRequest("Choose a file to ingest.");
    }
    const payload: Record<string, unknown> = { file_id: record.file_id.trim() };
    if (record.knowledge_base_id !== undefined) {
      if (typeof record.knowledge_base_id !== "string") {
        throw badRequest("The knowledge base id must be a string.");
      }
      payload.knowledge_base_id = record.knowledge_base_id;
    }
    for (const field of ["chunk_size", "chunk_overlap"] as const) {
      const value = record[field];
      if (value === undefined || value === null) continue;
      if (typeof value !== "number" || !Number.isInteger(value)) {
        throw badRequest(`\`${field}\` must be a whole number.`);
      }
      payload[field] = value;
    }
    if (record.run_inline !== undefined) {
      if (typeof record.run_inline !== "boolean") throw badRequest("`run_inline` must be true or false.");
      payload.run_inline = record.run_inline;
    }

    const { data } = await callUpstream<unknown>({
      path: "/ingestion-jobs",
      method: "POST",
      body: payload,
    });
    return NextResponse.json(data, { status: 202 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
