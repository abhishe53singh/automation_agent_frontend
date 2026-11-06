import { badRequest, toErrorResponse } from "@/server/errors";
import { openUpstreamBinary } from "@/server/upstream-binary";

/**
 * Raw bytes of a chat attachment (image thumbnails, download) — a byte
 * passthrough like `/api/files/{id}/download`, streamed with the upstream
 * Content-Type and `Content-Disposition: inline`.
 *
 * The bytes are user-uploaded and served same-origin, so the response is
 * locked down: `nosniff` plus a sandboxing CSP means an uploaded SVG/HTML
 * opened in a new tab cannot run script against this origin.
 */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string; attachmentId: string }> },
): Promise<Response> {
  try {
    const { sessionId, attachmentId } = await params;
    if (!sessionId || !attachmentId) {
      return toErrorResponse(badRequest("A session and attachment id are required."));
    }
    const upstream = await openUpstreamBinary({
      path: `/chat/sessions/${encodeURIComponent(sessionId)}/attachments/${encodeURIComponent(attachmentId)}/content`,
    });

    const headers = new Headers();
    headers.set("Content-Type", upstream.headers.get("content-type") ?? "application/octet-stream");
    const length = upstream.headers.get("content-length");
    if (length) headers.set("Content-Length", length);
    headers.set("Content-Disposition", inlineDisposition(upstream.headers));
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set(
      "Content-Security-Policy",
      "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
    );
    headers.set("Cache-Control", "private, max-age=300");

    return new Response(upstream.body, { status: 200, headers });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** Keep the upstream filename (if any) but always render inline. */
function inlineDisposition(upstream: Headers): string {
  const original = upstream.get("content-disposition");
  if (!original) return "inline";
  return original.replace(/^\s*attachment/i, "inline");
}
