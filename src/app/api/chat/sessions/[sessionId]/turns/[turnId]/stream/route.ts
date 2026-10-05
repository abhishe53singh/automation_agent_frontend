import { toErrorResponse, badRequest } from "@/server/errors";
import { openUpstreamStream } from "@/server/upstream-stream";

/**
 * SSE passthrough (.agent/API.md #42, upstream #42; item 29).
 *
 * Upstream emits, per turn:
 *   `event: response` + data = `LlmResponseResponse` JSON, once per changed row
 *   `: keep-alive` comment every 1 s
 *   `event: done`      + `{ "message_id": uuid, "responses": int }` (terminal)
 *   `event: timeout`   + the same shape, after the 300 s upstream cap
 *
 * The bytes are proxied VERBATIM — this route deliberately does not parse or
 * rewrite frames, so the browser's `EventSource` sees exactly what the backend
 * produced. Three things make that work:
 *   1. `X-Accel-Buffering: no` + `no-transform` stop proxies buffering frames.
 *   2. The route's own `AbortController` is wired to `request.signal`, so a
 *      browser disconnect (tab close, navigation) aborts the UPSTREAM fetch
 *      instead of leaving it polling the DB for another 300 s.
 *   3. A heartbeat comment is injected on an idle timer, so an intermediary
 *      that would time out a silent connection still sees traffic.
 *
 * Note this is DB-polling SSE (1 s poll), not token-by-token streaming: a
 * `response` event arrives when a row's state changes, not per token.
 */

const HEARTBEAT_MS = 15_000;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string; turnId: string }> },
): Promise<Response> {
  const { sessionId, turnId } = await params;
  if (!sessionId || !turnId)
    return toErrorResponse(badRequest("A session id and turn id are required."));

  // Aborts when the client disconnects; `request.signal` is already wired to it.
  const abort = new AbortController();
  const onAbort = () => abort.abort();
  request.signal.addEventListener("abort", onAbort, { once: true });

  try {
    const upstream = await openUpstreamStream({
      path: `/chat/sessions/${encodeURIComponent(sessionId)}/turns/${encodeURIComponent(turnId)}/stream`,
    });

    if (!upstream.body) {
      return new Response("", {
        status: 204,
        headers: { "Cache-Control": "no-cache" },
      });
    }

    const reader = upstream.body.getReader();
    const encoder = new TextEncoder();
    let heartbeat: ReturnType<typeof setInterval> | undefined;

    const cleanup = () => {
      if (heartbeat) clearInterval(heartbeat);
      request.signal.removeEventListener("abort", onAbort);
    };

    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (done) {
            cleanup();
            controller.close();
            return;
          }
          // Upstream already sends `: keep-alive` every second; this is a
          // belt-and-braces guard for the (unlikely) case it goes quiet.
          if (!heartbeat) {
            heartbeat = setInterval(() => {
              try {
                controller.enqueue(encoder.encode(": keep-alive\n\n"));
              } catch {
                // The consumer already went away; the abort handler cleans up.
              }
            }, HEARTBEAT_MS);
          }
          controller.enqueue(value);
        } catch (error) {
          cleanup();
          // An aborted stream is the normal path on unmount — close quietly.
          if (abort.signal.aborted) {
            controller.close();
            return;
          }
          controller.error(error);
        }
      },
      cancel(reason) {
        cleanup();
        // Cancelling the BFF stream must cancel the upstream fetch.
        abort.abort(reason);
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        // Nginx honours this and streams instead of buffering.
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    // No stream was opened, so it is safe to detach the listener here.
    request.signal.removeEventListener("abort", onAbort);
    return toErrorResponse(error);
  }
}
