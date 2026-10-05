import { z } from "zod";

/**
 * Auth module schemas. Response shapes are the upstream ones from
 * `.backend_agent/API.md` minus every token field — the BFF never sends
 * tokens to the browser.
 */

/** Upstream `UserResponse` (id/username/email/is_active). */
export const userSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  email: z.string().email(),
  is_active: z.boolean(),
});
export type User = z.infer<typeof userSchema>;

/** GET /api/session */
export const sessionSchema = z.object({
  user: userSchema.nullable(),
  expires_at: z.string().nullable(),
});
export type Session = z.infer<typeof sessionSchema>;

/** POST /api/auth/{login,signup,google} */
export const authSessionSchema = z.object({
  user: userSchema.nullable(),
  expires_at: z.string().nullable().optional(),
});
export type AuthSession = z.infer<typeof authSessionSchema>;

/** POST /api/auth/forgot-password — raw reset token passthrough. */
export const forgotPasswordSchema = z.object({
  message: z.string(),
  reset_token: z.string().nullable(),
  expires_at: z.string().nullable(),
});
export type ForgotPasswordResult = z.infer<typeof forgotPasswordSchema>;

/** POST /api/auth/{reset-password,logout} */
export const messageSchema = z.object({ message: z.string() });
export type MessageResult = z.infer<typeof messageSchema>;
