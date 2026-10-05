import { z } from "zod";

import { userSchema } from "@/modules/auth/schemas";

/**
 * Projects module schemas (.agent/API.md #11-#19; shapes from
 * `.backend_agent/API.md` entries 11-19).
 */

/** The caller's role in a project, as returned by the backend on every project. */
export const projectRoleSchema = z.enum(["owner", "admin", "member", "viewer"]);
export type ProjectRole = z.infer<typeof projectRoleSchema>;

/** Roles that can be ASSIGNED to a member — "owner" is implicit, never assignable. */
export const assignableRoleSchema = z.enum(["admin", "member", "viewer"]);
export type AssignableRole = z.infer<typeof assignableRoleSchema>;

/** Upstream `ProjectResponse` — `role` is the CALLER's role, not the project's. */
export const projectSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  instructions: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  role: projectRoleSchema,
});
export type Project = z.infer<typeof projectSchema>;

/**
 * Upstream `ProjectMemberResponse` — carries the nested `user` record.
 *
 * `role` spans ALL project roles: the members list INCLUDES the owner's row
 * (the creator is always a member with role "owner"), so reading must accept
 * it. "owner" is only rejected on WRITE (invite / role update) — see
 * `assignableRoleSchema`.
 */
export const projectMemberSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: projectRoleSchema,
  created_at: z.string(),
  user: userSchema,
});
export type ProjectMember = z.infer<typeof projectMemberSchema>;

/** POST /api/projects — create payload. */
export const projectCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150, "Max 150 characters"),
  description: z.string().max(2000, "Max 2000 characters").optional(),
  instructions: z.string().max(20000, "Max 20000 characters").optional(),
});
export type ProjectCreate = z.infer<typeof projectCreateSchema>;

/**
 * PATCH /api/projects/{id} — a partial update.
 *
 * The three states are load-bearing (item 22):
 *   - key absent  -> the field is left untouched (not sent)
 *   - `null`      -> the field is explicitly CLEARED
 *   - string      -> the field is replaced
 * `exactOptionalPropertyTypes`-style explicitness, so the UI can offer a
 * "clear description" button that is different from "leave it alone".
 */
export const projectUpdateSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(150, "Max 150 characters").optional(),
    description: z.string().max(2000, "Max 2000 characters").nullable().optional(),
    instructions: z.string().max(20000, "Max 20000 characters").nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Send at least one field to update.",
  });
export type ProjectUpdate = z.infer<typeof projectUpdateSchema>;

/** POST /api/projects/{id}/members — exactly one of user_id / email (item 23). */
export const memberInviteSchema = z
  .object({
    user_id: z.string().trim().min(1).optional(),
    email: z.string().trim().email("Enter a valid email address").optional(),
    role: assignableRoleSchema.default("member"),
  })
  .refine((value) => Boolean(value.user_id) !== Boolean(value.email), {
    message: "Provide exactly one of a user id or an email address.",
    path: ["email"],
  });
export type MemberInvite = z.infer<typeof memberInviteSchema>;

/** PATCH /api/projects/{id}/members/{memberId} */
export const memberRoleUpdateSchema = z.object({ role: assignableRoleSchema });
export type MemberRoleUpdate = z.infer<typeof memberRoleUpdateSchema>;
