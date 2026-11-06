"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Shows the outcome of the Google OAuth round trip. The BFF callback
 * (/api/integrations/google/callback) redirects here with
 * `?google=connected` or `?google=error&message=…`; we toast once and strip
 * the params so a refresh doesn't repeat it.
 */
export function GoogleConnectNotice() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const status = searchParams.get("google");
  const message = searchParams.get("message");

  useEffect(() => {
    if (!status) return;
    if (status === "connected") {
      toast.success("Google account connected.");
    } else if (status === "error") {
      toast.error(message || "Google connection failed.");
    }

    const next = new URLSearchParams(searchParams.toString());
    next.delete("google");
    next.delete("message");
    const query = next.toString();
    router.replace((query ? `${pathname}?${query}` : pathname) as Route, { scroll: false });
  }, [status, message, pathname, router, searchParams]);

  return null;
}
