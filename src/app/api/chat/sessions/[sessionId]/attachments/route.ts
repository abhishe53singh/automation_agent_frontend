import { NextResponse } from "next/server";

import { badRequest, toErrorResponse } from "@/server/errors";
import { callUpstream } from "@/server/upstream";

/**
 * Per-chat attachments. Documents become this chat's private knowledge base
 * (searched on every message); images ride along with the message they are
 * attached to.
 *
 * GET lists the chat's files (newest first).
 * POST is a multipart passthrough like `/api/files`: a minimal FormData is
 * rebuilt with every `files` part and forwarded byte-for-byte. Upstream parses
 * and embeds synchronously, so the call gets a long budget; a file it cannot
 * parse still comes back (status "failed"), only auth/size/no-files fail here.
 */

/** Upper bound on parts per request — the composer sends one batch at a time. */
const MAX_FILES_PER_REQUEST = 20;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse> {
  try {
    const { sessionId } = await params;
    if (!sessionId) throw badRequest("A session id is required.");
    const { data } = await callUpstream<unknown>({
      path: `/chat/sessions/${encodeURIComponent(sessionId)}/attachments`,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse> {
  try {
    const { sessionId } = await params;
    if (!sessionId) throw badRequest("A session id is required.");

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("multipart/form-data")) {
      throw badRequest("Upload files using multipart form data.");
    }
    const form = await request.formData();
    // FormDataEntryValue is string | File; checking "not a string" (rather than
    // `instanceof File`) stays correct across runtimes' File implementations.
    const files = form.getAll("files").filter((part): part is File => typeof part !== "string");
    if (files.length === 0) throw badRequest("Choose a file first.");
    if (files.length > MAX_FILES_PER_REQUEST) {
      throw badRequest(`Attach at most ${MAX_FILES_PER_REQUEST} files at a time.`);
    }
    const empty = files.find((file) => file.size === 0);
    if (empty) throw badRequest(`“${empty.name}” is empty.`);

    // Rebuild minimal FormData: only the `files` parts travel upstream.
    const forward = new FormData();
    for (const file of files) forward.append("files", file, file.name);

    const { data } = await callUpstream<unknown>({
      path: `/chat/sessions/${encodeURIComponent(sessionId)}/attachments`,
      method: "POST",
      body: forward,
      timeoutMs: 180_000,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
