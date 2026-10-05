"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { login, logout, signup } from "./api";
import { getSession, userKeys } from "@/modules/users/api";
import type { User } from "./schemas";

/**
 * Session hooks (.agent/phase_2.txt items 15-18). Mutations invalidate through
 * an explicit map — no component-level refetching
 * (.agent/API_CONTEXT.txt §3).
 */

/** The signed-in user, or null. A signed-out visitor resolves, it does not throw. */
export function useSession() {
  return useQuery({
    queryKey: userKeys.session,
    queryFn: async ({ signal }): Promise<User | null> => (await getSession(signal)).user,
    staleTime: 60_000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: login,
    onSuccess: (session) => {
      queryClient.setQueryData(userKeys.session, session.user);
      queryClient.invalidateQueries({ queryKey: userKeys.me });
    },
  });
}

export function useSignup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: signup,
    onSuccess: (session) => {
      queryClient.setQueryData(userKeys.session, session.user);
      queryClient.invalidateQueries({ queryKey: userKeys.me });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      // The session is gone server-side: drop every cached response.
      queryClient.setQueryData(userKeys.session, null);
      queryClient.removeQueries();
    },
  });
}
