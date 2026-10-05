"use client";

import * as React from "react";
import { Trash2, UserPlus } from "lucide-react";

import { memberInviteSchema } from "../api";
import { canManageMembers, isProtectedMember } from "../rbac";
import { useInviteMember, useProjectMembers, useRemoveMember, useUpdateMemberRole } from "../hooks";
import { MemberRoleSelect } from "./MemberRoleSelect";
import {
  assignableRoleSchema,
  type AssignableRole,
  type Project,
  type ProjectMember,
} from "../schemas";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  Input,
  Select,
  Skeleton,
} from "@/shared/ui";
import { AsyncBoundary } from "@/shared/ui/AsyncBoundary";

/**
 * Members panel (item 23) with the RBAC guards of item 24.
 *
 * The invite form requires EXACTLY ONE of user_id / email (the same xor the
 * backend enforces) and never offers `owner` as a role. The owner row is shown
 * with its controls disabled rather than hidden, so it is obvious that a
 * project cannot be orphaned.
 */
export function MembersPanel({ project }: { project: Project }) {
  const members = useProjectMembers(project.id);
  const canManage = canManageMembers(project);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle>Members</CardTitle>
            <CardDescription>
              {canManage
                ? "Invite people by user id or email address and set their role."
                : "Only the owner and admins can change the member list."}
            </CardDescription>
          </div>
          {canManage ? <InviteMemberButton projectId={project.id} /> : null}
        </div>
      </CardHeader>
      <CardContent>
        <AsyncBoundary
          isPending={members.isPending}
          error={members.error}
          isEmpty={(members.data ?? []).length === 0}
          skeleton={
            <div className="space-y-2">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          }
          onRetry={() => void members.refetch()}
          empty={
            <p className="text-sm text-muted-foreground">
              No members yet. The project owner is not part of the member list.
            </p>
          }
        >
          <ul className="divide-y divide-border">
            {(members.data ?? []).map((member) => (
              <MemberRow key={member.id} project={project} member={member} canManage={canManage} />
            ))}
          </ul>
        </AsyncBoundary>
      </CardContent>
    </Card>
  );
}

function MemberRow({
  project,
  member,
  canManage,
}: {
  project: Project;
  member: ProjectMember;
  canManage: boolean;
}) {
  const changeRole = useUpdateMemberRole(project.id);
  const remove = useRemoveMember(project.id);
  const protectedRow = isProtectedMember(project, member);

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{member.user.username}</p>
        <p className="truncate text-xs text-muted-foreground">{member.user.email}</p>
        {protectedRow ? (
          <p className="text-xs text-muted-foreground">
            Owner — protected: the role cannot be changed and the row cannot be removed.
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <MemberRoleSelect
          role={member.role}
          disabled={!canManage || protectedRow}
          pending={changeRole.isPending}
          onChange={(role) => changeRole.mutate({ memberId: member.id, role })}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Remove ${member.user.username}`}
          disabled={!canManage || protectedRow}
          loading={remove.isPending}
          onClick={() => remove.mutate(member.id)}
        >
          <Trash2 aria-hidden />
        </Button>
      </div>
    </li>
  );
}

/** Invite dialog. The target is a user id XOR an email — never both, never neither. */
function InviteMemberButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = React.useState(false);
  const [target, setTarget] = React.useState("");
  const [role, setRole] = React.useState<AssignableRole>("member");
  const [error, setError] = React.useState<string | undefined>();

  const invite = useInviteMember(projectId);

  const close = () => {
    if (invite.isPending) return;
    setOpen(false);
    setTarget("");
    setRole("member");
    setError(undefined);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = target.trim();
    // A uuid is a user id; anything else is treated as an email and validated.
    const looksLikeUserId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    );
    const payload = looksLikeUserId ? { user_id: value, role } : { email: value, role };

    const parsed = memberInviteSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the highlighted fields.");
      return;
    }
    setError(undefined);
    invite.mutate(parsed.data, { onSuccess: close });
  };

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <UserPlus aria-hidden />
        Invite member
      </Button>

      <Dialog
        open={open}
        onClose={close}
        title="Invite a member"
        description="Paste an existing account's user id or email address. The person must already have an account."
        footer={
          <>
            <Button type="button" variant="outline" onClick={close} disabled={invite.isPending}>
              Cancel
            </Button>
            <Button type="button" onClick={submit} loading={invite.isPending}>
              Add member
            </Button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <Input
            label="User id or email"
            value={target}
            required
            autoFocus
            error={error}
            placeholder="jane@example.com"
            hint="Exactly one target: an email address, or a user id (uuid)."
            onChange={(event) => setTarget(event.target.value)}
          />
          <Select
            label="Role"
            value={role}
            onChange={(event) => {
              const next = assignableRoleSchema.safeParse(event.target.value);
              if (next.success) setRole(next.data);
            }}
            hint="The owner role is assigned at creation and cannot be granted."
          >
            {(["admin", "member", "viewer"] as const).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
          <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
        </form>
      </Dialog>
    </>
  );
}
