import { z } from "zod";

/**
 * Server-side environment contract (.agent/phase_1.txt item 8).
 *
 * Only variables WITHOUT the NEXT_PUBLIC_ prefix are allowed here: they are
 * read inside route handlers / server components and must never reach the
 * browser. Anything the browser needs goes in `clientEnv` below.
 *
 * The backend is never called directly from the browser — every upstream call
 * is proxied by the BFF gateway (src/app/api/**), see .agent/API_CONTEXT.txt.
 */

const serverSchema = z.object({
  /** FastAPI backend base URL, proxied by the BFF gateway. */
  API_BASE_URL: z
    .url({ error: "API_BASE_URL must be a valid absolute URL" })
    .default("http://localhost:8000"),
  /** Set to "true" to log full upstream error bodies server-side. */
  API_DEBUG: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

export type ServerEnv = z.infer<typeof serverSchema>;

/**
 * Client-side contract. Every key MUST be prefixed with NEXT_PUBLIC_ because
 * Next.js inlines only those into the browser bundle. Keep it minimal — the
 * browser needs no backend URL.
 */
const clientSchema = z.object({
  /** Enables the bundle analyzer during `next build`. */
  NEXT_PUBLIC_ENABLE_ANALYZER: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  /**
   * Fixture mode (.agent/phase_4.txt item 37).
   *
   * With `NEXT_PUBLIC_MOCK=1` the chat and llm modules answer from in-memory
   * fixtures instead of the BFF, so the whole chat UI is developable before the
   * backend has LLM provider adapters. The backend's `llm_responses` legitimately
   * sit at `pending` until an adapter exists, which makes the live path hard to
   * exercise — fixtures let the pending → completed transition, branching and
   * streaming UI be built and reviewed.
   */
  NEXT_PUBLIC_MOCK: z
    .enum(["0", "1"])
    .default("0")
    .transform((v) => v === "1"),
});

export type ClientEnv = z.infer<typeof clientSchema>;

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}

function parseOrThrow<T extends z.ZodType>(schema: T, raw: unknown, label: string): z.infer<T> {
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Invalid ${label} configuration:\n${formatIssues(result.error)}\n` +
        `Copy .env.example to .env.local and fill in the missing values.`,
    );
  }
  return result.data;
}

/**
 * Validated server env. Lazy (a getter) so a missing value only fails when a
 * server module actually touches the config — never at import time during
 * `next build`.
 */
let cachedServerEnv: ServerEnv | undefined;
export function getServerEnv(): ServerEnv {
  cachedServerEnv ??= parseOrThrow(serverSchema, process.env, "server");
  return cachedServerEnv;
}

/** Validated public env, safe to read from client components. */
export function getClientEnv(): ClientEnv {
  return parseOrThrow(
    clientSchema,
    {
      NEXT_PUBLIC_ENABLE_ANALYZER: process.env.NEXT_PUBLIC_ENABLE_ANALYZER,
      NEXT_PUBLIC_MOCK: process.env.NEXT_PUBLIC_MOCK,
    },
    "client",
  );
}

/**
 * True when fixture mode is on. Read through this helper (never
 * `process.env` directly) so the value stays Zod-validated and inlined by
 * Next.js in the client bundle.
 */
export function isMockMode(): boolean {
  return getClientEnv().NEXT_PUBLIC_MOCK;
}
