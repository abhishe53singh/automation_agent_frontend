import { badRequest, toErrorResponse } from "@/server/errors";
import { openUpstreamBinary } from "@/server/upstream-binary";

/**
 * Download a file that was sent with one of our inbox replies. A byte
 * passthrough (the generic /api/email/[...slug] proxy only returns JSON),
 * always as a download (`attachment`), never rendered in the app's origin.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ replyId: string; index: string }> },
): Promise<Response> {
  try {
    const { replyId, index } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(replyId) || !/^\d{1,3}$/.test(index)) {
      throw badRequest("Invalid attachment.");
    }
    const upstream = await openUpstreamBinary({
      path: `/email-inbox/replies/${replyId}/attachments/${index}`,
    });

    const headers = new Headers();
    headers.set("Content-Type", upstream.headers.get("content-type") ?? "application/octet-stream");
    const length = upstream.headers.get("content-length");
    if (length) headers.set("Content-Length", length);
    const disposition = upstream.headers.get("content-disposition") ?? "attachment";
    headers.set("Content-Disposition", disposition.replace(/^\s*inline/i, "attachment"));
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Content-Security-Policy", "sandbox; default-src 'none'");
    headers.set("Cache-Control", "private, no-store");

    return new Response(upstream.body, { status: 200, headers });
  } catch (error) {
    return toErrorResponse(error);
  }
}
