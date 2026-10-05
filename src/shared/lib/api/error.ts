/**
 * The single error type every browser-side fetch in this app speaks
 * (.agent/phase_2.txt item 14). BFF routes always answer failures with the
 * envelope documented in .agent/API_CONTEXT.txt §3:
 *
 *   { "error": { "code": "str", "message": "str", "status": "int" } }
 *
 * so a failed request becomes an ApiError here and nothing else — components
 * branch on `code`/`status`, never on the raw response.
 */

export const ERROR_CODES = [
  "unauthorized",
  "forbidden",
  "not_found",
  "validation",
  "conflict",
  "rate_limited",
  "upstream",
  "network",
  "timeout",
] as const;

export type ApiErrorCode = (typeof ERROR_CODES)[number];

export function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return typeof value === "string" && (ERROR_CODES as readonly string[]).includes(value);
}

/** Status -> code used when the upstream sends no (or an unknown) envelope code. */
export function codeForStatus(status: number): ApiErrorCode {
  switch (status) {
    case 401:
      return "unauthorized";
    case 403:
      return "forbidden";
    case 404:
      return "not_found";
    case 409:
      return "conflict";
    case 422:
    case 400:
      return "validation";
    case 429:
      return "rate_limited";
    default:
      return "upstream";
  }
}

/** Human-readable fallback so a toast never shows an empty string. */
export function defaultMessageForCode(code: ApiErrorCode): string {
  switch (code) {
    case "unauthorized":
      return "Your session has expired. Please sign in again.";
    case "forbidden":
      return "You do not have permission to do that.";
    case "not_found":
      return "Not found.";
    case "validation":
      return "Please check the highlighted fields.";
    case "conflict":
      return "That value is already taken.";
    case "rate_limited":
      return "Too many requests. Please slow down.";
    case "timeout":
      return "The request timed out. Please try again.";
    case "network":
      return "Cannot reach the server. Check your connection.";
    case "upstream":
    default:
      return "Something went wrong. Please try again.";
  }
}

export interface ApiErrorEnvelope {
  error: { code: ApiErrorCode; message: string; status: number };
}

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(code: ApiErrorCode, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }

  /** True for the two transport failures that deserve a retry UI (item 18). */
  get isTransient(): boolean {
    return this.code === "network" || this.code === "timeout" || this.code === "rate_limited";
  }

  static fromStatus(status: number, message?: string): ApiError {
    const code = codeForStatus(status);
    return new ApiError(code, message?.trim() || defaultMessageForCode(code), status);
  }

  /** Normalize anything thrown inside the data layer into an ApiError. */
  static normalize(error: unknown): ApiError {
    if (error instanceof ApiError) return error;
    if (error instanceof DOMException && error.name === "AbortError") {
      return new ApiError("timeout", defaultMessageForCode("timeout"), 408);
    }
    return new ApiError("network", defaultMessageForCode("network"), 0);
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
