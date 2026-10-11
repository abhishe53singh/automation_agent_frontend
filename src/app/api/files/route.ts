import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * Files collection (.agent/phase_5.txt item 39, upstream #43/#45).
 *
 * GET lists the caller's uploads (optionally project-scoped).
 * POST is a multipart passthrough: the browser's FormData is forwarded
 * byte-for-byte (never JSON-serialized) so the boundary survives.
 */

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const projectId = new URL(request.url).searchParams.get("projectId");
    const { data } = await callUpstream<unknown>({
      path: "/files",
      query: { project_id: projectId || undefined },
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("multipart/form-data")) {
      throw badRequest("Upload a file using multipart form data.");
    }
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw badRequest("Choose a file first.");
    }
    const projectId = form.get("project_id");
    if (projectId !== null && typeof projectId !== "string") {
      throw badRequest("The project id must be a string.");
    }

    // Rebuild minimal FormData: only the file + optional scope travel upstream.
    const forward = new FormData();
    forward.append("file", file, file.name);
    if (typeof projectId === "string" && projectId.trim()) {
      forward.append("project_id", projectId.trim());
    }

    const { data } = await callUpstream<unknown>({
      path: "/files",
      method: "POST",
      body: forward,
      timeoutMs: 120_000,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
