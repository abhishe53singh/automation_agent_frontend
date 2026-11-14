import { badRequest, toErrorResponse } from "@/server/errors";
import { openUpstreamBinary } from "@/server/upstream-binary";

/**
 * GET /api/chat/sessions/{sessionId}/generated-files/{fileId}/download — the
 * bytes of a file the assistant generated (PDF, DOCX, XLSX, PPTX, CSV, MD).
 *
 * A byte passthrough like the attachment content route, but kept as a
 * download (`attachment` disposition from upstream, incl. the UTF-8
 * filename*). Upstream enforces ownership: the chat must be the caller's and
 * the file must have been generated in it. Locked down like every
 * same-origin byte route: nosniff + a sandboxing CSP.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string; fileId: string }> },
): Promise<Response> {
  try {
    const { sessionId, fileId } = await params;
    if (!sessionId || !fileId) {
      return toErrorResponse(badRequest("A session and file id are required."));
    }
    const upstream = await openUpstreamBinary({
      path: `/chat/sessions/${encodeURIComponent(sessionId)}/generated-files/${encodeURIComponent(fileId)}/download`,
    });

    const headers = new Headers();
    headers.set("Content-Type", upstream.headers.get("content-type") ?? "application/octet-stream");
    const length = upstream.headers.get("content-length");
    if (length) headers.set("Content-Length", length);
    headers.set("Content-Disposition", upstream.headers.get("content-disposition") ?? "attachment");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Content-Security-Policy", "sandbox; default-src 'none'");
    headers.set("Cache-Control", "private, max-age=300");

    return new Response(upstream.body, { status: 200, headers });
  } catch (error) {
    return toErrorResponse(error);
  }
}
