import { z } from "zod";

import { TIMEOUTS, apiJson, apiVoid, definedOnly, parseWith } from "@/shared/lib/api";

import {
  memberInviteSchema,
  memberRoleUpdateSchema,
  projectCreateSchema,
  projectMemberSchema,
  projectSchema,
  projectUpdateSchema,
  type AssignableRole,
  type MemberInvite,
  type MemberRoleUpdate,
  type Project,
  type ProjectCreate,
  type ProjectMember,
  type ProjectUpdate,
} from "./schemas";

/**
 * Projects module API client (.agent/API.md #11-#19, upstream #11-#19).
 *
 * Every function speaks only to the same-origin BFF. `undefined` in a PATCH
 * body is dropped (see `projectUpdateSchema`); `null` is sent as an explicit
 * clear.
 */

/**
 * Hierarchical query keys (item 21). The nesting is the invalidation contract:
 *   ["projects"]                 -> the list (and the dashboard's recent list)
 *   ["projects", id]             -> one project
 *   ["projects", id, "members"]  -> that project's member list
 *
 * Because the project key is a PREFIX of the members key, invalidating
 * ["projects", id] refreshes the members too — no extra bookkeeping.
 */
export const projectKeys = {
  all: ["projects"] as const,
  list: () => ["projects", "list"] as const,
  recent: () => ["projects", "recent"] as const,
  detail: (projectId: string) => ["projects", projectId] as const,
  members: (projectId: string) => ["projects", projectId, "members"] as const,
};

const projectListSchema = z.array(projectSchema);
const memberListSchema = z.array(projectMemberSchema);

const id = (projectId: string) => encodeURIComponent(projectId);

/** GET /api/projects — the caller's projects, each with their `role`. */
export function listProjects(signal?: AbortSignal): Promise<Project[]> {
  return apiJson("/api/projects", { signal }, (value) =>
    parseWith(projectListSchema, value, "GET /api/projects"),
  );
}

/** GET /api/projects/{id} — 404 when unknown *or* not a member (masked). */
export function getProject(projectId: string, signal?: AbortSignal): Promise<Project> {
  return apiJson(`/api/projects/${id(projectId)}`, { signal }, (value) =>
    parseWith(projectSchema, value, "GET /api/projects/{id}"),
  );
}

/** POST /api/projects — the caller becomes the owner. */
export function createProject(input: ProjectCreate, signal?: AbortSignal): Promise<Project> {
  return apiJson(
    "/api/projects",
    { method: "POST", body: input, signal, timeoutMs: TIMEOUTS.mutation },
    (value) => parseWith(projectSchema, value, "POST /api/projects"),
  );
}

/**
 * PATCH /api/projects/{id} — partial. Absent keys are omitted, so only what the
 * user actually changed is sent; an explicit `null` clears a nullable field.
 */
export function updateProject(
  projectId: string,
  input: ProjectUpdate,
  signal?: AbortSignal,
): Promise<Project> {
  return apiJson(
    `/api/projects/${id(projectId)}`,
    {
      method: "PATCH",
      body: definedOnly(input as Record<string, unknown>),
      signal,
      timeoutMs: TIMEOUTS.mutation,
    },
    (value) => parseWith(projectSchema, value, "PATCH /api/projects/{id}"),
  );
}

/** DELETE /api/projects/{id} — owner only, cascades project-scoped data. */
export function deleteProject(projectId: string, signal?: AbortSignal): Promise<void> {
  return apiVoid(`/api/projects/${id(projectId)}`, { method: "DELETE", signal });
}

/** GET /api/projects/{id}/members — the member rows include the nested user. */
export function listProjectMembers(
  projectId: string,
  signal?: AbortSignal,
): Promise<ProjectMember[]> {
  return apiJson(`/api/projects/${id(projectId)}/members`, { signal }, (value) =>
    parseWith(memberListSchema, value, "GET /api/projects/{id}/members"),
  );
}

/**
 * POST /api/projects/{id}/members — invite by EXACTLY ONE of user_id / email.
 * The Zod refinement in `memberInviteSchema` enforces the xor before the call.
 */
export function inviteProjectMember(
  projectId: string,
  input: MemberInvite,
  signal?: AbortSignal,
): Promise<ProjectMember> {
  const body = input.user_id
    ? { user_id: input.user_id, role: input.role }
    : { email: input.email, role: input.role };

  return apiJson(
    `/api/projects/${id(projectId)}/members`,
    { method: "POST", body, signal, timeoutMs: TIMEOUTS.mutation },
    (value) => parseWith(projectMemberSchema, value, "POST /api/projects/{id}/members"),
  );
}

/** PATCH /api/projects/{id}/members/{memberId} — change a member's role. */
export function updateMemberRole(
  projectId: string,
  memberId: string,
  role: AssignableRole,
  signal?: AbortSignal,
): Promise<ProjectMember> {
  // Validated here too, so an impossible role never leaves the browser.
  const { role: parsedRole } = memberRoleUpdateSchema.parse({ role });

  return apiJson(
    `/api/projects/${id(projectId)}/members/${encodeURIComponent(memberId)}`,
    { method: "PATCH", body: { role: parsedRole }, signal, timeoutMs: TIMEOUTS.mutation },
    (value) => parseWith(projectMemberSchema, value, "PATCH /api/projects/{id}/members/{memberId}"),
  );
}

/** DELETE /api/projects/{id}/members/{memberId} — 400 for the owner row. */
export function removeProjectMember(
  projectId: string,
  memberId: string,
  signal?: AbortSignal,
): Promise<void> {
  return apiVoid(`/api/projects/${id(projectId)}/members/${encodeURIComponent(memberId)}`, {
    method: "DELETE",
    signal,
  });
}

/** Re-exported so pages can validate a form before firing the mutation. */
export { memberInviteSchema, projectCreateSchema, projectUpdateSchema };
export type {
  AssignableRole,
  MemberInvite,
  MemberRoleUpdate,
  Project,
  ProjectCreate,
  ProjectMember,
  ProjectUpdate,
};
