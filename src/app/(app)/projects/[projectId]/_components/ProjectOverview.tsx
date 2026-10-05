"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { MessageSquare, MessageSquarePlus, Users, FileText } from "lucide-react";

import { useProject, useProjectMembers } from "@/modules/projects/hooks";
import { useSessions } from "@/modules/chat/hooks";
import { canEdit, ROLE_LABELS } from "@/modules/projects/rbac";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Skeleton,
} from "@/shared/ui";
import { RelativeTime } from "@/shared/ui/RelativeTime";
import { sessionLabel } from "@/modules/chat/schemas";

export function ProjectOverview({ projectId }: { projectId: string }) {
  const { data: project } = useProject(projectId);
  const { data: members, isPending: membersPending } = useProjectMembers(projectId);
  const { data: sessions, isPending: sessionsPending } = useSessions({ projectId });

  if (!project) return null;

  const recentSessions = (sessions ?? []).slice(0, 5);
  const userCanEdit = canEdit(project);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="size-4 text-muted-foreground" />
                Instructions
              </CardTitle>
              <CardDescription>
                System guidance applied to all AI models chatting in this project.
              </CardDescription>
            </div>
            {userCanEdit ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/projects/${projectId}/settings` as Route}>
                  Edit
                </Link>
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {project.instructions?.trim() ? (
            <div className="rounded-md bg-muted/50 p-3 text-sm text-foreground whitespace-pre-wrap font-mono text-xs max-h-48 overflow-y-auto border border-border">
              {project.instructions}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No custom instructions set for this project yet.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="size-4 text-muted-foreground" />
                Recent chats
              </CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/projects/${projectId}/chat` as Route}>
                  View all
                </Link>
              </Button>
            </div>
            <CardDescription>Conversations scoped to this project.</CardDescription>
          </CardHeader>
          <CardContent>
            {sessionsPending ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }, (_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : recentSessions.length > 0 ? (
              <ul className="divide-y divide-border">
                {recentSessions.map((session) => (
                  <li key={session.id} className="py-2.5 flex items-center justify-between gap-2">
                    <Link
                      href={`/projects/${projectId}/chat/${session.id}` as Route}
                      className="truncate text-sm font-medium text-foreground hover:underline"
                    >
                      {sessionLabel(session)}
                    </Link>
                    <RelativeTime dateTime={session.updated_at} className="text-xs shrink-0" />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={MessageSquarePlus}
                title="No chats yet"
                description="Start a chat in this project to collaborate with models."
                action={
                  <Button asChild size="sm">
                    <Link href={`/projects/${projectId}/chat` as Route}>
                      <MessageSquarePlus aria-hidden />
                      New chat
                    </Link>
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="size-4 text-muted-foreground" />
                Members
              </CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/projects/${projectId}/members` as Route}>
                  Manage
                </Link>
              </Button>
            </div>
            <CardDescription>People collaborating in this project.</CardDescription>
          </CardHeader>
          <CardContent>
            {membersPending ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }, (_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm py-1">
                  <span className="text-muted-foreground">Your role</span>
                  <Badge variant={project.role === "owner" ? "primary" : "neutral"}>
                    {ROLE_LABELS[project.role]}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm py-1 border-t border-border">
                  <span className="text-muted-foreground">Collaborators</span>
                  <span className="font-medium text-foreground">
                    {(members ?? []).length} member{(members ?? []).length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}