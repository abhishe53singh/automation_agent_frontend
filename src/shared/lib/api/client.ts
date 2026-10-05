import { ApiError, isApiErrorCode, defaultMessageForCode, codeForStatus } from "./error";

/**
 * Browser fetch wrapper for the same-origin BFF (.agent/API_CONTEXT.txt §1).
 *
 * Responsibilities kept deliberately narrow so feature modules only deal with
 * data: JSON in/out, a request timeout with a caller-supplied AbortSignal,
 * and normalization of every failure mode into an ApiError.
 */

export const DEFAULT_TIMEOUT_MS = 15_000;

/** Per-key timeout budget — retrieval/chat/ingestion calls legitimately run long. */
export const TIMEOUTS = {
  default: 15_000,
  session: 10_000,
  mutation: 20_000,
  upload: 120_000,
} as const;

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  /** JSON body. Omit for GET/DELETE or when sending FormData. */
  body?: unknown;
  /** Extra headers merged last (multipart must not set Content-Type). */
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
  query?: Record<string, string | number | boolean | null | undefined>;
  /** Send no body and skip JSON parsing (204 responses, downloads). */
  raw?: boolean;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  headers: Headers;
}

/** Serialize a query object, dropping null/undefined/"" so we never send noise. */
export function buildUrl(path: string, query?: ApiRequestOptions["query"]): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/**
 * Combine the caller's signal with our timeout signal, so a page-level abort
 * (unmount, navigation) still cancels the in-flight request.
 */
function withTimeout(signal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new DOMException("timeout", "TimeoutError")),
    timeoutMs,
  );

  const onAbort = () => controller.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener("abort", onAbort, { once: true });
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    },
  };
}

async function readEnvelope(response: Response): Promise<{ code?: string; message?: string }> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object") {
      const record = body as Record<string, unknown>;
      const error = record.error;
      if (error && typeof error === "object") {
        const { code, message } = error as { code?: unknown; message?: unknown };
        return {
          code: typeof code === "string" ? code : undefined,
          message: typeof message === "string" ? message : undefined,
        };
      }
      // FastAPI passthrough that lost its envelope: {"detail": "..."} or a
      // validation array [{ "msg": ... }].
      const detail = record.detail;
      if (typeof detail === "string") return { message: detail };
      if (Array.isArray(detail) && detail.length > 0) {
        const first = detail[0] as { msg?: unknown };
        if (first && typeof first.msg === "string") return { message: first.msg };
      }
    }
  } catch {
    // Non-JSON body (e.g. an HTML error page) — fall through to the status map.
  }
  return {};
}

/** Low-level fetch: resolves with the Response, throws ApiError on any failure. */
export async function apiFetch(path: string, options: ApiRequestOptions = {}): Promise<Response> {
  const {
    method = "GET",
    body,
    headers = {},
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    query,
  } = options;

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const requestHeaders: Record<string, string> = { Accept: "application/json", ...headers };
  if (body !== undefined && !isFormData) {
    requestHeaders["Content-Type"] = "application/json";
  }

  const { signal: merged, cleanup } = withTimeout(signal, timeoutMs);
  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
      signal: merged,
      // Session lives in httpOnly cookies; the BFF is same-origin.
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch (error) {
    // Distinguish "the caller aborted" from "our timeout fired".
    if (signal?.aborted) throw ApiError.normalize(error);
    throw new ApiError("network", defaultMessageForCode("network"), 0);
  } finally {
    cleanup();
  }

  if (!response.ok) {
    const envelope = await readEnvelope(response);
    const code = isApiErrorCode(envelope.code) ? envelope.code : codeForStatus(response.status);
    throw new ApiError(
      code,
      envelope.message?.trim() || defaultMessageForCode(code),
      response.status,
    );
  }

  return response;
}

/** JSON variant — parses the body and narrows it through `select` (see parse.ts).
 *
 *  `select` receives the raw parsed JSON as `unknown`; module api functions
 *  pass a Zod schema through `parseWith`, which is what produces the type.
 */
export async function apiJson<T = unknown>(
  path: string,
  options: ApiRequestOptions,
  select: (value: unknown) => T,
): Promise<T> {
  const response = await apiFetch(path, options);
  if (options.raw || response.status === 204) return undefined as T;

  const text = await response.text();
  if (!text) return undefined as T;
  try {
    return select(JSON.parse(text) as unknown);
  } catch {
    // A malformed body is an upstream contract break, not a network problem.
    throw new ApiError("upstream", defaultMessageForCode("upstream"), response.status);
  }
}

/** Convenience wrapper for endpoints that answer with no body (204). */
export async function apiVoid(path: string, options: ApiRequestOptions = {}): Promise<void> {
  await apiFetch(path, { ...options, raw: true });
}
