import { z } from "zod";

/**
 * Client-side form validation (.agent/phase_2.txt item 16). These are UX-only
 * constraints layered on top of the BFF's own checks — the server stays the
 * authority and its messages always win.
 *
 * The backend's signup schema uses a bare `str` (no strength/format rules), so
 * the minimum length and email shape are enforced here.
 */

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required.")
  .email("Enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(128, "That password is too long.");

export const loginSchema = z.object({
  // Upstream `/auth/login` accepts a username OR an email in this field.
  username: z.string().trim().min(1, "Email or username is required."),
  password: z.string().min(1, "Password is required."),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, "Use at least 3 characters.")
      .max(64, "That username is too long.")
      .regex(/^[\w.-]+$/, "Letters, numbers, dot, dash and underscore only."),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
export type RegisterValues = z.infer<typeof registerSchema>;

/**
 * Form (input) schemas. Named `*Values` to avoid colliding with the RESPONSE
 * schemas of the same name in ./schemas.ts.
 */
export const forgotPasswordValues = z.object({ email: emailSchema });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordValues>;

export const resetPasswordValues = z
  .object({
    token: z.string().trim().min(1, "The reset token is required."),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
export type ResetPasswordValues = z.infer<typeof resetPasswordValues>;

/** Flatten a ZodError into `{ fieldName: firstMessage }` for the inputs. */
export function fieldErrors(error: {
  issues: readonly { path: readonly PropertyKey[]; message: string }[];
}): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "root");
    if (!(key in result)) result[key] = issue.message;
  }
  return result;
}
