import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * Single file (upstream #46-#48).
 * GET fetches, PATCH renames/re-scopes, DELETE cascades.
 */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> },
): Promise<NextResponse> {
  try {
    const { fileId } = await params;
    if (!fileId) throw badRequest("A file id is required.");
    const { data } = await callUpstream<unknown>({
      path: `/files/${encodeURIComponent(fileId)}`,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> },
): Promise<NextResponse> {
  try {
    const { fileId } = await params;
    if (!fileId) throw badRequest("A file id is required.");
    const body: unknown = await request.json();
    const record = (body ?? {}) as Record<string, unknown>;
    const payload: Record<string, unknown> = {};

    if (record.filename !== undefined) {
      if (record.filename !== null && typeof record.filename !== "string") {
        throw badRequest("The file name must be a string.");
      }
      const name = typeof record.filename === "string" ? record.filename.trim() : "";
      if (typeof record.filename === "string" && !name) {
        throw badRequest("The file name cannot be empty.");
      }
      if (name.length > 255) throw badRequest("The file name must be 255 characters or fewer.");
      payload.filename = record.filename === null ? null : name;
    }
    if (record.project_id !== undefined) {
      if (record.project_id !== null && typeof record.project_id !== "string") {
        throw badRequest("The project id must be a string.");
      }
      payload.project_id = record.project_id;
    }
    if (Object.keys(payload).length === 0) {
      throw badRequest("Send a new name or project to update the file.");
    }

    const { data } = await callUpstream<unknown>({
      path: `/files/${encodeURIComponent(fileId)}`,
      method: "PATCH",
      body: payload,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> },
): Promise<NextResponse> {
  try {
    const { fileId } = await params;
    if (!fileId) throw badRequest("A file id is required.");
    await callUpstream({ path: `/files/${encodeURIComponent(fileId)}`, method: "DELETE" });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
