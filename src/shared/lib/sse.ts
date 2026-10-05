/**
 * A tiny, dependency-free server-sent-events CLIENT
 * (.agent/phase_4.txt item 34).
 *
 * Why not the platform `EventSource`? Three reasons:
 *   1. It cannot be tied to an `AbortSignal` in shipping browsers, and we must
 *      abort on unmount so the BFF cancels the upstream fetch instead of
 *      leaving it polling for another 300 s.
 *   2. It auto-reconnects. This stream is single-shot and terminal (`done` or
 *      `timeout`), so an automatic retry would duplicate a finished round.
 *   3. It reports no error detail — a 401 envelope from the BFF would arrive
 *      as an opaque "connection error" instead of our normal `ApiError`.
 *
 * `fetch` + a `ReadableStream` reader gives us all three. Frames are parsed
 * per the SSE spec (multi-line `data:` included), and `:` comment lines (the
 * backend's `: keep-alive`) are surfaced separately.
 */

import { ApiError, isApiErrorCode } from "@/shared/lib/api";

export interface SseEvent {
  /** The `event:` name, or "message" when the frame omits one. */
  event: string;
  /** The joined `data:` payload. */
  data: string;
  /** The `id:` field, when present. */
  id?: string;
}

export interface SseOptions {
  /** Called for every dispatched event. */
  onEvent: (event: SseEvent) => void;
  /** Called for a `: keep-alive` comment — useful for a "live" indicator. */
  onKeepAlive?: () => void;
  /** Called once when the stream ends (server close, terminal event, abort). */
  onClose?: () => void;
  /** Called on a transport or protocol failure. */
  onError?: (error: ApiError) => void;
  /** Caller's signal — aborting it tears the request down immediately. */
  signal?: AbortSignal;
  /** Return true for a terminal event to end the stream early. */
  shouldStop?: (event: SseEvent) => boolean;
}

/** Handle returned by `consumeSse`, so the caller can stop early. */
export interface SseSubscription {
  /** Abort the stream. Safe to call more than once. */
  close: () => void;
  /** Resolves when the stream is fully finished. */
  done: Promise<void>;
}

/**
 * Consume an SSE endpoint until the server closes it, the caller aborts, or
 * `shouldStop` returns true for a terminal (`done`/`timeout`) event.
 */
export function consumeSse(url: string, options: SseOptions): SseSubscription {
  const controller = new AbortController();
  const { signal, onEvent, onKeepAlive, onClose, onError, shouldStop } = options;

  // Chain the caller's signal so unmount/navigation aborts the request.
  const onCallerAbort = () => controller.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener("abort", onCallerAbort, { once: true });
  }

  const release = () => signal?.removeEventListener("abort", onCallerAbort);

  const done = (async () => {
    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: { Accept: "text/event-stream" },
        // Session lives in httpOnly cookies; the BFF is same-origin.
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (error) {
      release();
      // An abort is the normal path on unmount, not a failure to report.
      if (controller.signal.aborted) {
        onClose?.();
        return;
      }
      onError?.(ApiError.normalize(error));
      onClose?.();
      return;
    }

    if (!response.ok) {
      release();
      onError?.(await readErrorEnvelope(response));
      onClose?.();
      return;
    }

    const body = response.body;
    if (!body) {
      release();
      onClose?.();
      return;
    }

    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      for (;;) {
        const { done: finished, value } = await reader.read();
        if (finished) break;
        buffer += decoder.decode(value, { stream: true });

        // Frames are separated by a blank line; \r\n is tolerated per spec.
        const frames = buffer.split(/\r?\n\r?\n/);
        buffer = frames.pop() ?? "";

        for (const raw of frames) {
          const parsed = parseFrame(raw);
          if (!parsed) continue;
          if (parsed.comment) {
            onKeepAlive?.();
            continue;
          }
          if (!parsed.event) continue;

          const event: SseEvent = { event: parsed.event, data: parsed.data, id: parsed.id };
          onEvent(event);
          if (shouldStop?.(event)) {
            await reader.cancel().catch(() => undefined);
            release();
            onClose?.();
            return;
          }
        }
      }
    } catch (error) {
      release();
      if (!controller.signal.aborted) onError?.(ApiError.normalize(error));
      onClose?.();
      return;
    }

    release();
    onClose?.();
  })();

  return {
    close: () => {
      if (!controller.signal.aborted) {
        controller.abort(new DOMException("closed", "AbortError"));
      }
    },
    done,
  };
}
interface ParsedFrame {
  event?: string;
  data: string;
  id?: string;
  /** True for a `:` comment line (the backend's keep-alive). */
  comment: boolean;
}

/**
 * Parse one SSE frame. Returns null for an empty frame. Multiple `data:` lines
 * are joined with "\n", exactly as the specification requires.
 */
export function parseFrame(raw: string): ParsedFrame | null {
  if (!raw.trim()) return null;

  const lines = raw.split(/\r?\n/);
  const data: string[] = [];
  let event: string | undefined;
  let id: string | undefined;
  let sawField = false;

  for (const line of lines) {
    if (!line) continue;
    // A leading colon marks a comment.
    if (line.startsWith(":")) return { data: "", comment: true };

    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    // A single leading space after the colon is framing, not content.
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);

    if (field === "event") {
      event = value;
      sawField = true;
    } else if (field === "data") {
      data.push(value);
      sawField = true;
    } else if (field === "id") {
      id = value;
      sawField = true;
    } else if (field === "retry") {
      sawField = true;
    }
    // Unknown fields are ignored per the specification.
  }

  if (!sawField) return null;
  return { event, data: data.join("\n"), id, comment: false };
}

/** Turn a non-2xx SSE response into an ApiError, honouring the BFF envelope. */
async function readErrorEnvelope(response: Response): Promise<ApiError> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object") {
      const error = (body as { error?: { code?: unknown; message?: unknown } }).error;
      if (error && typeof error.message === "string") {
        const code = isApiErrorCode(error.code) ? error.code : undefined;
        return new ApiError(code ?? "upstream", error.message, response.status);
      }
    }
  } catch {
    // Non-JSON error body — fall back to the status mapping.
  }
  return ApiError.fromStatus(response.status);
}
