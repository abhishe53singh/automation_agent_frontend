import type { ZodType } from "zod";

import { ApiError, defaultMessageForCode } from "./error";

/**
 * Zod parse helper used at every module API boundary (.agent/phase_2.txt item 14,
 * .agent/API_CONTEXT.txt §3): "All responses are Zod-parsed at the module
 * boundary; a parse failure surfaces as code 'upstream' (schema-drift alarm),
 * never silent `any`."
 */
export function parseWith<T>(schema: ZodType<T>, value: unknown, context: string): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;

  const detail = result.error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
  // Logged server/client-side for diagnosis; the user only sees the generic text.
  console.error(`[api] schema drift while parsing ${context}: ${detail}`);

  throw new ApiError("upstream", defaultMessageForCode("upstream"), 502);
}

/** Drop `undefined` keys so PATCH bodies only carry changed fields. */
export function definedOnly<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}
