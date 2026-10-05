import type { Project, ProjectMember, ProjectRole } from "./schemas";

/**
 * RBAC UX helpers (.agent/phase_3.txt item 24).
 *
 * These MIRROR the backend's role rules — they never replace them:
 *
 *   read           = any role (owner, admin, member, viewer)
 *   edit           = owner, admin          (project fields)
 *   manage members = owner, admin          (invite / role / remove)
 *   delete         = owner only
 *
 * The backend answers an insufficient role with a MASKED 404, never a 403, so
 * hiding the action here is a UX courtesy, not a security boundary: the truth
 * always comes from the server. The helpers exist so the UI never shows a
 * button that is guaranteed to fail.
 */

const WRITE_ROLES: readonly ProjectRole[] = ["owner", "admin"];
const READ_ROLES: readonly ProjectRole[] = ["owner", "admin", "member", "viewer"];

/** The caller's role, or null when the project could not be loaded. */
export function roleOf(project: Pick<Project, "role"> | null | undefined): ProjectRole | null {
  return project?.role ?? null;
}

/** May open the project and read its fields/instructions. */
export function canRead(project: Pick<Project, "role"> | null | undefined): boolean {
  const role = roleOf(project);
  return role !== null && READ_ROLES.includes(role);
}

/** May edit name / description / instructions. */
export function canEdit(project: Pick<Project, "role"> | null | undefined): boolean {
  const role = roleOf(project);
  return role !== null && WRITE_ROLES.includes(role);
}

/** May invite members, change roles and remove members. */
export function canManageMembers(project: Pick<Project, "role"> | null | undefined): boolean {
  return canEdit(project);
}

/** May delete the project (owner only). */
export function canDelete(project: Pick<Project, "role"> | null | undefined): boolean {
  return roleOf(project) === "owner";
}

/**
 * The owner row is immutable: the backend rejects any role change (400) and any
 * removal (400), so those controls are disabled rather than hidden, to explain
 * why the project cannot be orphaned.
 */
export function isProtectedMember(
  project: Pick<Project, "user_id"> | null | undefined,
  member: Pick<ProjectMember, "user_id">,
): boolean {
  return Boolean(project) && project?.user_id === member.user_id;
}

/** Role -> label for badges. */
export const ROLE_LABELS: Record<ProjectRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

/** Short human summary of what the caller may do, shown on the detail page. */
export function permissionsSummary(project: Pick<Project, "role"> | null | undefined): string {
  if (!canRead(project)) return "You do not have access to this project.";
  if (canDelete(project))
    return "You own this project: you can edit, manage members and delete it.";
  if (canEdit(project)) return "You can edit this project and manage its members.";
  if (roleOf(project) === "member")
    return "You can use this project but cannot change its settings.";
  return "You have read-only access to this project.";
}
