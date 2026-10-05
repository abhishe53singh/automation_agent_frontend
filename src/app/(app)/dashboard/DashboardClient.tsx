"use client";

import Link from "next/link";
import type { Route } from "next";
import { MessagesSquare, Plus } from "lucide-react";

import { CreateProjectDialog } from "@/modules/projects/components/CreateProjectDialog";
import { formatDate } from "@/modules/projects/components/ProjectCard";
import { useRecentProjects } from "@/modules/projects/hooks";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui";
import { AsyncBoundary, CardGridSkeleton } from "@/shared/ui/AsyncBoundary";

const RECENT_LIMIT = 4;

/**
 * Dashboard client half. Its data is already in the cache from the server
 * prefetch, so the `isPending` branch below is only seen if the prefetch failed.
 */
export function DashboardClient() {
  const { data, isPending, error, refetch } = useRecentProjects();
  const projects = data ?? [];
  const recent = [...projects]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, RECENT_LIMIT);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Pick up where you left off, or start something new.
          </p>
        </div>

        {/* Quick actions (item 26). */}
        <div className="flex flex-wrap items-center gap-2">
          <CreateProjectDialog />
          <Button asChild variant="outline">
            <Link href={"/chat" as Route}>
              <MessagesSquare aria-hidden />
              New chat
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent projects</CardTitle>
          <CardDescription>The projects you touched most recently.</CardDescription>
        </CardHeader>
        <CardContent>
          <AsyncBoundary
            isPending={isPending}
            error={error}
            isEmpty={recent.length === 0}
            skeleton={<CardGridSkeleton rows={2} />}
            onRetry={() => void refetch()}
            empty={
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  You have no projects yet. Create one to group your chats, files and knowledge.
                </p>
                <CreateProjectDialog triggerLabel="Create a project" />
              </div>
            }
          >
            <ul className="divide-y divide-border">
              {recent.map((project) => (
                <li key={project.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/projects/${project.id}` as Route}
                      className="truncate text-sm font-medium text-foreground hover:underline"
                    >
                      {project.name}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {project.description?.trim() || "No description yet."}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={project.role === "owner" ? "primary" : "neutral"}>
                      {project.role}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(project.updated_at)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </AsyncBoundary>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>All projects</CardTitle>
            <CardDescription>Manage members, settings and deletion.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={"/projects" as Route}>
                <Plus aria-hidden />
                Go to projects
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Models &amp; providers</CardTitle>
            <CardDescription>Register the LLMs available to chat.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={"/settings/llm" as Route}>Open registry</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
