import { NextResponse } from "next/server";

import { getServerEnv } from "@/config/env";

/**
 * Server-side error normalization (.agent/API_CONTEXT.txt §3). Every failing
 * `/api/**` route answers with exactly:
 *
 *   { "error": { "code", "message", "status" } }
 */

export type ServerErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation"
  | "conflict"
  | "rate_limited"
  | "upstream"
  | "network"
  | "timeout";

const STATUS_TO_CODE: Record<number, ServerErrorCode> = {
  400: "validation",
  401: "unauthorized",
  403: "forbidden",
  404: "not_found",
  409: "conflict",
  422: "validation",
  429: "rate_limited",
};

export function codeForUpstreamStatus(status: number): ServerErrorCode {
  return STATUS_TO_CODE[status] ?? (status >= 500 ? "upstream" : "validation");
}

const DEFAULT_MESSAGE: Record<ServerErrorCode, string> = {
  unauthorized: "Authentication required.",
  forbidden: "You do not have permission to do that.",
  not_found: "Not found.",
  validation: "The request payload is invalid.",
  conflict: "That value is already taken.",
  rate_limited: "Too many requests.",
  upstream: "The upstream service failed to handle the request.",
  network: "Cannot reach the upstream service.",
  timeout: "The upstream request timed out.",
};

export function errorResponse(
  code: ServerErrorCode,
  status: number,
  message?: string,
): NextResponse {
  return NextResponse.json(
    { error: { code, message: message?.trim() || DEFAULT_MESSAGE[code], status } },
    { status },
  );
}

/** A thrown value that a route handler can render as an envelope. */
export class HttpError extends Error {
  readonly code: ServerErrorCode;
  readonly status: number;

  constructor(code: ServerErrorCode, status: number, message?: string) {
    super(message ?? DEFAULT_MESSAGE[code]);
    this.name = "HttpError";
    this.code = code;
    this.status = status;
  }
}

export const unauthorized = (message?: string) => new HttpError("unauthorized", 401, message);
export const forbidden = (message?: string) => new HttpError("forbidden", 403, message);
export const notFound = (message?: string) => new HttpError("not_found", 404, message);
export const badRequest = (message?: string) => new HttpError("validation", 400, message);
export const upstreamError = (message?: string) => new HttpError("upstream", 502, message);

/** Last-resort handler: turn anything thrown in a route into an envelope. */
export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    return errorResponse(error.code, error.status, error.message);
  }
  if (getServerEnv().API_DEBUG) {
    console.error("[api] unhandled route error:", error);
  }
  return errorResponse("upstream", 500, "Internal server error.");
}

/**
 * Extract a human message from a FastAPI error body so backend `detail`
 * strings reach the user instead of a generic phrase.
 */
export function messageFromUpstream(body: unknown, fallback: string): string {
  if (typeof body === "string" && body.trim()) return body;
  if (body && typeof body === "object") {
    const detail = (body as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: unknown };
      if (first && typeof first.msg === "string") return first.msg;
    }
  }
  return fallback;
}
