"use client";

import type { User } from "@/modules/auth/schemas";
import { ApiError } from "@/shared/lib/api";
import { Button } from "@/shared/ui";

import { useUpdateUserStatus } from "../hooks";

/**
 * Admin status toggle (.agent/phase_2.txt item 17, upstream #10).
 *
 * The ADMIN_EMAILS allowlist lives entirely in the backend env, so the
 * frontend cannot pre-check admin rights. The control is therefore always
 * visible but honest: on a 403 it explains that admin rights are required
 * instead of pretending the user is an admin. Upstream also rejects a
 * self-change with 400, which arrives as error.validation.
 */
export function AdminStatusControl({ target }: { target: User }) {
  const update = useUpdateUserStatus();

  const forbidden = update.error instanceof ApiError && update.error.code === "forbidden";

  const toggle = () => {
    update.mutate({ userId: target.id, isActive: !target.is_active });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Account status</p>
          <p className="text-sm text-muted-foreground">
            {target.is_active
              ? "This account can sign in and use the API."
              : "This account is deactivated and its refresh tokens are revoked."}
          </p>
        </div>
        <Button
          type="button"
          variant={target.is_active ? "destructive" : "primary"}
          onClick={toggle}
          loading={update.isPending}
        >
          {target.is_active ? "Deactivate" : "Activate"}
        </Button>
      </div>

      {forbidden ? (
        <p role="status" className="text-sm text-muted-foreground">
          This action requires an administrator account (the server&apos;s ADMIN_EMAILS allowlist).
        </p>
      ) : null}
    </div>
  );
}
