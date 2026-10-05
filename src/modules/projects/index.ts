/** Projects module public surface (.agent/API_CONTEXT.txt §1). */
export {
  createProject,
  deleteProject,
  getProject,
  inviteProjectMember,
  listProjectMembers,
  listProjects,
  memberInviteSchema,
  projectCreateSchema,
  projectKeys,
  projectUpdateSchema,
  removeProjectMember,
  updateMemberRole,
  updateProject,
  type MemberInvite,
  type Project,
  type ProjectCreate,
  type ProjectMember,
  type ProjectUpdate,
} from "./api";
export {
  invalidateProjects,
  useCreateProject,
  useDeleteProject,
  useInviteMember,
  useProject,
  useProjectMembers,
  useProjects,
  useRecentProjects,
  useRemoveMember,
  useUpdateMemberRole,
  useUpdateProject,
} from "./hooks";
export {
  ROLE_LABELS,
  canDelete,
  canEdit,
  canManageMembers,
  canRead,
  isProtectedMember,
  permissionsSummary,
  roleOf,
} from "./rbac";
export {
  assignableRoleSchema,
  projectMemberSchema,
  projectRoleSchema,
  projectSchema,
  type AssignableRole,
  type ProjectRole,
} from "./schemas";
export { CreateProjectDialog } from "./components/CreateProjectDialog";
export { MemberRoleSelect } from "./components/MemberRoleSelect";
export { MembersPanel } from "./components/MembersPanel";
export { ProjectCard } from "./components/ProjectCard";
export { ProjectDetailsForm } from "./components/ProjectDetailsForm";
export { ProjectsList } from "./components/ProjectsList";
