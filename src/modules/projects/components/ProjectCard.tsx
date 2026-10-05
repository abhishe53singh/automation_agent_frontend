"use client";

import Link from "next/link";
import type { Route } from "next";
import { FolderKanban } from "lucide-react";

import { ROLE_LABELS } from "../rbac";
import type { Project } from "../schemas";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui";

const ROLE_VARIANTS: Record<Project["role"], "primary" | "info" | "neutral"> = {
  owner: "primary",
  admin: "info",
  member: "neutral",
  viewer: "neutral",
};

/** One project card in the list (item 22). Purely presentational. */
export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.id}` as Route}
      className="block rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="h-full transition-colors hover:border-primary/50">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{project.name}</span>
            </CardTitle>
            <Badge variant={ROLE_VARIANTS[project.role]}>{ROLE_LABELS[project.role]}</Badge>
          </div>
          <CardDescription className="line-clamp-2 min-h-10">
            {project.description?.trim() || "No description yet."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Updated {formatDate(project.updated_at)}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

/** Shared, locale-stable short date (server and client must agree to avoid hydration warnings). */
export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return date.toISOString().slice(0, 10);
}
