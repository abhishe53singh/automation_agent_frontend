"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authKeys } from "@/modules/auth/api";

import { getMe, getSession, updateUserStatus, userKeys } from "./api";
import type { User } from "@/modules/auth/schemas";

/** Users module hooks (.agent/phase_2.txt item 17). */

export { userKeys };

/** The raw session payload, including `expires_at`. */
export function useSessionQuery() {
  return useQuery({
    queryKey: userKeys.session,
    queryFn: ({ signal }) => getSession(signal),
    staleTime: 60_000,
  });
}

/** Explicit GET /api/users/me (401s without a session). */
export function useMe() {
  return useQuery({
    queryKey: userKeys.me,
    queryFn: ({ signal }) => getMe(signal),
    staleTime: 60_000,
  });
}

/**
 * Admin status toggle. The frontend cannot know who is an admin — the backend
 * owns the ADMIN_EMAILS allowlist — so a 403 surfaces as error.forbidden and
 * the UI simply explains that admin rights are required.
 */
export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      updateUserStatus(userId, isActive),
    onSuccess: (updated: User) => {
      // Keep the session payload consistent without a round trip.
      queryClient.setQueryData<{ user: User | null; expires_at: string | null }>(
        authKeys.session,
        (previous) =>
          previous?.user?.id === updated.id ? { ...previous, user: updated } : previous,
      );
      queryClient.setQueryData(userKeys.me, updated);
      queryClient.invalidateQueries({ queryKey: userKeys.status(updated.id) });
    },
  });
}
