import { z } from "zod";

import { userSchema, type User } from "@/modules/auth/schemas";
import { TIMEOUTS, apiJson, parseWith } from "@/shared/lib/api";

/**
 * Users module (.agent/API.md #8-#10): the session view, `/users/me` and the
 * admin-only status toggle.
 */

export const userKeys = {
  session: ["session"] as const,
  me: ["users", "me"] as const,
  status: (userId: string) => ["users", userId, "status"] as const,
};

const sessionResponseSchema = z.object({
  user: userSchema.nullable(),
  expires_at: z.string().nullable(),
});

export type SessionResponse = z.infer<typeof sessionResponseSchema>;

/** GET /api/session -> `{ user: User | null, expires_at }`. */
export function getSession(signal?: AbortSignal): Promise<SessionResponse> {
  return apiJson("/api/session", { signal, timeoutMs: TIMEOUTS.session }, (value) =>
    parseWith(sessionResponseSchema, value, "GET /api/session"),
  );
}

/** GET /api/users/me — throws error.unauthorized without a session. */
export function getMe(signal?: AbortSignal): Promise<User> {
  return apiJson("/api/users/me", { signal, timeoutMs: TIMEOUTS.session }, (value) =>
    parseWith(userSchema, value, "GET /api/users/me"),
  );
}

/**
 * PATCH /api/users/{userId}/status — upstream #10, admin only.
 *
 * The allowlist lives in the backend's ADMIN_EMAILS env var, so the frontend
 * cannot know who is an admin: it calls and renders whatever the backend
 * decides (403 -> error.forbidden, 400 self-change, 404 unknown user).
 */
export function updateUserStatus(
  userId: string,
  isActive: boolean,
  signal?: AbortSignal,
): Promise<User> {
  return apiJson(
    `/api/users/${encodeURIComponent(userId)}/status`,
    { method: "PATCH", body: { is_active: isActive }, signal, timeoutMs: TIMEOUTS.mutation },
    (value) => parseWith(userSchema, value, "PATCH /api/users/{id}/status"),
  );
}
