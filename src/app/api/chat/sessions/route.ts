import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * Chat sessions collection (.agent/API.md #30-#31, upstream #30-#31).
 *
 * POST creates a chat, optionally scoped to a project the caller belongs to
 * and pre-attached to active registry models. 404 for an unknown/inaccessible
 * project (the project 404 mask applies here too), 400 for an unknown or
 * inactive model id.
 */

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const params = new URL(request.url).searchParams;
    const includeArchived = params.get("includeArchived");

    const { data } = await callUpstream<unknown>({
      path: "/chat/sessions",
      query: {
        project_id: params.get("projectId") || undefined,
        include_archived:
          includeArchived === null || includeArchived === "" ? undefined : includeArchived,
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
    const {
      title,
      project_id: projectId,
      model_ids: modelIds,
    } = (body ?? {}) as Record<string, unknown>;

    if (title !== undefined && title !== null && typeof title !== "string") {
      throw badRequest("`title` must be a string.");
    }
    if (typeof title === "string" && title.length > 200) {
      throw badRequest("The chat title must be 200 characters or fewer.");
    }
    if (projectId !== undefined && projectId !== null && typeof projectId !== "string") {
      throw badRequest("`project_id` must be a string.");
    }
    if (modelIds !== undefined && modelIds !== null) {
      if (!Array.isArray(modelIds) || modelIds.some((value) => typeof value !== "string")) {
        throw badRequest("`model_ids` must be a list of strings.");
      }
    }

    // Omitted optional fields are left out entirely: upstream distinguishes
    // "absent" (use the default) from an explicit null.
    const payload: Record<string, unknown> = {};
    if (typeof title === "string" && title.trim()) payload.title = title.trim();
    if (typeof projectId === "string" && projectId.trim()) payload.project_id = projectId.trim();
    if (Array.isArray(modelIds)) payload.model_ids = modelIds;

    const { data } = await callUpstream<unknown>({
      path: "/chat/sessions",
      method: "POST",
      body: payload,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
