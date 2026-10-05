import { TIMEOUTS, apiJson, parseWith } from "@/shared/lib/api";

import {
  authSessionSchema,
  forgotPasswordSchema,
  messageSchema,
  type AuthSession,
  type ForgotPasswordResult,
} from "./schemas";

/**
 * Auth module API client (.agent/API.md #2-#7). Typed calls to the same-origin
 * BFF only — no backend URL is ever referenced from the browser.
 *
 * Query keys live here next to their api function
 * (.agent/API_CONTEXT.txt §3).
 */

export const authKeys = {
  session: ["session"] as const,
  me: ["users", "me"] as const,
};

export interface LoginInput {
  username: string;
  password: string;
  signal?: AbortSignal;
}

export interface SignupInput {
  username: string;
  email: string;
  password: string;
  signal?: AbortSignal;
}

/** POST /api/auth/login -> `{ user }` + Set-Cookie (tokens stay server-side). */
export function login(input: LoginInput): Promise<AuthSession> {
  const { signal, ...body } = input;
  return apiJson("/api/auth/login", { method: "POST", body, signal }, (value) =>
    parseWith(authSessionSchema, value, "POST /api/auth/login"),
  );
}

/** POST /api/auth/signup -> 201 `{ user }` + Set-Cookie. */
export function signup(input: SignupInput): Promise<AuthSession> {
  const { signal, ...body } = input;
  return apiJson(
    "/api/auth/signup",
    { method: "POST", body, signal, timeoutMs: TIMEOUTS.mutation },
    (value) => parseWith(authSessionSchema, value, "POST /api/auth/signup"),
  );
}

/** POST /api/auth/logout — clears the cookies; safe to call when signed out. */
export async function logout(signal?: AbortSignal): Promise<string> {
  const result = await apiJson("/api/auth/logout", { method: "POST", signal }, (value) =>
    parseWith(messageSchema, value, "POST /api/auth/logout"),
  );
  return result.message;
}

/**
 * POST /api/auth/forgot-password. The backend sends no email, so a `reset_token`
 * is returned inline when the account exists and null otherwise.
 */
export function forgotPassword(email: string, signal?: AbortSignal): Promise<ForgotPasswordResult> {
  return apiJson(
    "/api/auth/forgot-password",
    { method: "POST", body: { email }, signal },
    (value) => parseWith(forgotPasswordSchema, value, "POST /api/auth/forgot-password"),
  );
}

/** POST /api/auth/reset-password — upstream 400 surfaces as error.validation. */
export async function resetPassword(
  input: { token: string; newPassword: string },
  signal?: AbortSignal,
): Promise<string> {
  const result = await apiJson(
    "/api/auth/reset-password",
    { method: "POST", body: { token: input.token, new_password: input.newPassword }, signal },
    (value) => parseWith(messageSchema, value, "POST /api/auth/reset-password"),
  );
  return result.message;
}

/**
 * POST /api/auth/google. Kept wired for when the Google Identity script lands —
 * GOOGLE_CLIENT_ID is unset in this backend, so the BFF answers 503
 * (error.upstream) and the UI surfaces that message.
 */
export function googleLogin(idToken: string, signal?: AbortSignal): Promise<AuthSession> {
  return apiJson(
    "/api/auth/google",
    { method: "POST", body: { id_token: idToken }, signal },
    (value) => parseWith(authSessionSchema, value, "POST /api/auth/google"),
  );
}
