"use client";

import { assignableRoleSchema, type AssignableRole, type ProjectRole } from "../schemas";
import { Select } from "@/shared/ui";

const ROLE_OPTIONS: readonly AssignableRole[] = ["admin", "member", "viewer"];

const ROLE_HINTS: Record<ProjectRole, string> = {
  owner: "The project creator; the owner role cannot be changed.",
  admin: "Can edit the project and manage its members.",
  member: "Can use the project but not change its settings.",
  viewer: "Read-only access to the project.",
};

/**
 * Inline role select for a member row (items 23-24).
 *
 * Disabled for the owner row and when the caller lacks `canManageMembers`, so
 * a control that the backend would refuse with a 400/404 is never actionable.
 * `role` spans all project roles because the members list includes the owner's
 * row; the owner value still renders as a (non-selectable) option.
 */
export function MemberRoleSelect({
  role,
  disabled,
  pending,
  onChange,
}: {
  role: ProjectRole;
  disabled: boolean;
  pending: boolean;
  onChange: (role: AssignableRole) => void;
}) {
  const options: readonly string[] =
    role === "owner" ? (["owner", ...ROLE_OPTIONS] as const) : ROLE_OPTIONS;

  return (
    <Select
      aria-label="Member role"
      value={role}
      disabled={disabled || pending}
      hint={ROLE_HINTS[role]}
      className="w-36"
      onChange={(event) => {
        const next = assignableRoleSchema.safeParse(event.target.value);
        if (next.success) onChange(next.data);
      }}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </Select>
  );
}
