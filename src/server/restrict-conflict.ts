import { HttpError } from "./errors";

/**
 * RESTRICT-FK conflict mapping (.agent/phase_3.txt item 25).
 *
 * Deleting an LLM provider or model that is referenced by chat history is a
 * legitimate business outcome, not a server fault. The backend reports the
 * SQLAlchemy `IntegrityError` as a 500, so the BFF re-labels it 409
 * `error.conflict` and the UI can say "in use by chat history".
 *
 * Only 5xx is remapped: a 400 (validation) or 404 (unknown) stays as-is.
 */
export function conflictError(message: string): HttpError {
  return new HttpError("conflict", 409, message);
}

export function toRestrictConflict(error: unknown, message: string): unknown {
  if (error instanceof HttpError && error.status >= 500 && error.status < 600) {
    return conflictError(message);
  }
  return error;
}
