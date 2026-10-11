import { badRequest, toErrorResponse } from "@/server/errors";
import { openUpstreamBinary } from "@/server/upstream-binary";

/**
 * File download (upstream #49) — a byte passthrough, not JSON.
 * Content-Disposition + content type are preserved; upstream 410
 * ("bytes missing from disk") becomes error code "gone".
 */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> },
): Promise<Response> {
  try {
    const { fileId } = await params;
    if (!fileId) return toErrorResponse(badRequest("A file id is required."));
    return await openUpstreamBinary({
      path: `/files/${encodeURIComponent(fileId)}/download`,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
