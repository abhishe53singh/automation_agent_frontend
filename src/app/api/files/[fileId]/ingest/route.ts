import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * File ingest (upstream #50) — parse → chunk → embed.
 * `run_inline=true` (default) works synchronously; false queues a job.
 */

const PROVIDERS = ["local", "openai", "cohere", "voyage", "azure-openai", "gemini"] as const;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> },
): Promise<NextResponse> {
  try {
    const { fileId } = await params;
    if (!fileId) throw badRequest("A file id is required.");

    const body: unknown = await request.json().catch(() => ({}));
    const record = (body ?? {}) as Record<string, unknown>;
    const payload: Record<string, unknown> = {};

    if (record.knowledge_base_id !== undefined) {
      if (typeof record.knowledge_base_id !== "string") {
        throw badRequest("The knowledge base id must be a string.");
      }
      payload.knowledge_base_id = record.knowledge_base_id;
    }
    for (const field of ["chunk_size", "chunk_overlap", "embedding_dimension"] as const) {
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
    if (record.embedding_provider !== undefined) {
      if (typeof record.embedding_provider !== "string") {
        throw badRequest("The embedding provider must be a string.");
      }
      if (!(PROVIDERS as readonly string[]).includes(record.embedding_provider)) {
        throw badRequest("That embedding provider is not supported.");
      }
      payload.embedding_provider = record.embedding_provider;
    }
    if (record.embedding_model !== undefined) {
      if (typeof record.embedding_model !== "string") {
        throw badRequest("The embedding model must be a string.");
      }
      payload.embedding_model = record.embedding_model;
    }

    const { data } = await callUpstream<unknown>({
      path: `/files/${encodeURIComponent(fileId)}/ingest`,
      method: "POST",
      body: payload,
      timeoutMs: 120_000,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
