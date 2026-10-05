"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { isApiError } from "@/shared/lib/api";

import {
  createProject,
  deleteProject,
  getProject,
  inviteProjectMember,
  listProjectMembers,
  listProjects,
  projectKeys,
  removeProjectMember,
  updateMemberRole,
  updateProject,
} from "./api";
import type { AssignableRole, MemberInvite, ProjectCreate, ProjectUpdate } from "./schemas";

/**
 * Projects module hooks (.agent/phase_3.txt item 21).
 *
 * The invalidation map is explicit rather than a blanket `invalidateQueries()`:
 * the `projectKeys` hierarchy means the right target is always a prefix.
 *
 *   create            -> ["projects"]          (every list + the dashboard)
 *   update project    -> ["projects", id]      (detail AND members, by prefix)
 *   delete project    -> drop ["projects", id], invalidate ["projects"]
 *   invite / role /
 *   remove member     -> ["projects", id, "members"]
 */

/** Central invalidation map, exported so pages and tests share one definition. */
export function invalidateProjects(
  queryClient: QueryClient,
  scope: "list" | "detail",
  id?: string,
): void {
  if (scope === "list") {
    void queryClient.invalidateQueries({ queryKey: projectKeys.all });
    return;
  }
  if (!id) return;
  // Prefix match: this also refreshes ["projects", id, "members"].
  void queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
}

function messageFor(error: unknown, fallback: string): string {
  return isApiError(error) ? error.message : fallback;
}

/** GET /api/projects. */
export function useProjects() {
  return useQuery({
    queryKey: projectKeys.list(),
    queryFn: ({ signal }) => listProjects(signal),
    staleTime: 30_000,
  });
}

/**
 * The dashboard's recent-projects query (item 26). It is prefetched on the
 * server, so the first client paint already has the data — no waterfall.
 */
export function useRecentProjects() {
  return useQuery({
    queryKey: projectKeys.recent(),
    queryFn: ({ signal }) => listProjects(signal),
    staleTime: 60_000,
  });
}

/** GET /api/projects/{id} — 404 when unknown *or* the caller is not a member. */
export function useProject(projectId: string | null | undefined) {
  return useQuery({
    queryKey: projectKeys.detail(projectId ?? ""),
    queryFn: ({ signal }) => getProject(projectId as string, signal),
    enabled: Boolean(projectId),
    staleTime: 30_000,
  });
}

/** GET /api/projects/{id}/members. */
export function useProjectMembers(projectId: string | null | undefined) {
  return useQuery({
    queryKey: projectKeys.members(projectId ?? ""),
    queryFn: ({ signal }) => listProjectMembers(projectId as string, signal),
    enabled: Boolean(projectId),
    staleTime: 30_000,
  });
}

/** POST /api/projects. On success, refreshes every project list. */
export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectCreate) => createProject(input),
    onSuccess: (project) => {
      invalidateProjects(queryClient, "list");
      // Seed the detail cache so the first visit to the new project is instant.
      queryClient.setQueryData(projectKeys.detail(project.id), project);
      toast.success(`Project “${project.name}” created.`);
    },
    onError: (error) => toast.error(messageFor(error, "Could not create the project.")),
  });
}

/**
 * PATCH /api/projects/{id}. The detail cache is patched in place first for
 * instant feedback, then invalidated to reconcile with the server.
 */
export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectUpdate) => updateProject(projectId, input),
    onSuccess: (updated) => {
      queryClient.setQueryData(projectKeys.detail(projectId), updated);
      invalidateProjects(queryClient, "detail", projectId);
      toast.success("Project updated.");
    },
    onError: (error) => toast.error(messageFor(error, "Could not save the project.")),
  });
}

/** DELETE /api/projects/{id} — owner only. Navigates back to the list. */
export function useDeleteProject(projectId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () => deleteProject(projectId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: projectKeys.detail(projectId) });
      invalidateProjects(queryClient, "list");
      toast.success("Project deleted.");
      router.push("/projects");
    },
    onError: (error) => toast.error(messageFor(error, "Could not delete the project.")),
  });
}

/** POST members — invalidates the members list only. */
export function useInviteMember(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MemberInvite) => inviteProjectMember(projectId, input),
    onSuccess: () => {
      invalidateProjects(queryClient, "detail", projectId);
      toast.success("Member added.");
    },
    onError: (error) => toast.error(messageFor(error, "Could not add that member.")),
  });
}

/** PATCH members/{memberId} — role change. */
export function useUpdateMemberRole(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: AssignableRole }) =>
      updateMemberRole(projectId, memberId, role),
    onSuccess: () => {
      invalidateProjects(queryClient, "detail", projectId);
      toast.success("Role updated.");
    },
    onError: (error) => toast.error(messageFor(error, "Could not change that role.")),
  });
}

/** DELETE members/{memberId} — the owner row is refused before the call. */
export function useRemoveMember(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => removeProjectMember(projectId, memberId),
    onSuccess: () => {
      invalidateProjects(queryClient, "detail", projectId);
      toast.success("Member removed.");
    },
    onError: (error) => toast.error(messageFor(error, "Could not remove that member.")),
  });
}
