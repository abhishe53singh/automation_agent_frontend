/**
 * Browser-side API layer for the BFF gateway. Feature modules import from
 * "@/shared/lib/api"; nothing outside `src/server` knows the upstream host.
 */
export {
  apiFetch,
  apiJson,
  apiVoid,
  buildUrl,
  DEFAULT_TIMEOUT_MS,
  TIMEOUTS,
  type ApiRequestOptions,
  type ApiResponse,
} from "./client";
export {
  ApiError,
  ERROR_CODES,
  codeForStatus,
  defaultMessageForCode,
  isApiError,
  isApiErrorCode,
  type ApiErrorCode,
  type ApiErrorEnvelope,
} from "./error";
export { definedOnly, parseWith } from "./parse";
