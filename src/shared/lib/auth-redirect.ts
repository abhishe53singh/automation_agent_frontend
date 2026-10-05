"use client";

import { useRouter } from "next/navigation";

import { ApiError } from "@/shared/lib/api";

/**
 * Error surfaces (.agent/phase_2.txt item 18).
 *
 * 401 -> redirect to /login, remembering the intended destination.
 * Everything else is handled by the QueryCache/MutationCache toasts in
 * QueryProvider, so no rejection is ever unhandled here.
 */

/** Only same-origin, absolute-path destinations are accepted (no open redirect). */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw) return "/dashboard";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

/**
 * Send the user to the login page, preserving where they were going. Exported
 * so both the mutation-level guard and the ApiError branch can reuse it.
 */
export function useSessionExpiryRedirect() {
  const router = useRouter();
  return (next?: string) => {
    const target = safeNextPath(next);
    router.replace(`/login?next=${encodeURIComponent(target)}`);
  };
}

/**
 * Guard used by auth mutations: an expired session is a redirect, everything
 * else is rethrown for the form (and the toast cache) to display.
 */
export function rethrowAuthError(error: unknown, redirect: () => void): never {
  if (error instanceof ApiError && error.code === "unauthorized") {
    redirect();
  }
  throw error;
}
