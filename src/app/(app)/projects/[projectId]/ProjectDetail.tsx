"use client";

import Link from "next/link";
import * as React from "react";
import { ArrowLeft, Trash2 } from "lucide-react";

import { MembersPanel } from "@/modules/projects/components/MembersPanel";
import { ProjectDetailsForm } from "@/modules/projects/components/ProjectDetailsForm";
import { ROLE_LABELS, canDelete, permissionsSummary } from "@/modules/projects/rbac";
import { useDeleteProject, useProject } from "@/modules/projects/hooks";
import { Badge, Button, Card, CardDescription, CardHeader, CardTitle } from "@/shared/ui";
import { PanelSkeleton } from "@/shared/ui/AsyncBoundary";

/**
 * Client half of the project detail page.
 *
 * The project query is the source of truth for the caller's `role`, and every
 * control below is gated on it through the rbac helpers. A masked 404 (the
 * backend hides "exists but you cannot see it") is rendered as "Not found" by
 * the shared error state.
 */
export function ProjectDetail({ projectId }: { projectId: string }) {
  const project = useProject(projectId);
  const remove = useDeleteProject(projectId);
  const [confirming, setConfirming] = React.useState(false);

  if (project.isPending) return <PanelSkeleton />;
  if (project.error || !project.data) {
    return (
      <div className="space-y-4">
        <BackLink />
        <Card>
          <CardHeader>
            <CardTitle>Not found</CardTitle>
            <CardDescription>
              This project does not exist, or you do not have access to it.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const data = project.data;
  const deletable = canDelete(data);

  return (
    <div className="max-w-4xl space-y-6">
      <BackLink />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground">{data.name}</h1>
            <Badge variant={data.role === "owner" ? "primary" : "neutral"}>
              {ROLE_LABELS[data.role]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{permissionsSummary(data)}</p>
        </div>

        {deletable ? (
          confirming ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="destructive"
                loading={remove.isPending}
                onClick={() => remove.mutate()}
              >
                Delete permanently
              </Button>
              <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" onClick={() => setConfirming(true)}>
              <Trash2 aria-hidden />
              Delete project
            </Button>
          )
        ) : null}
      </div>

      {confirming ? (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle>This cannot be undone</CardTitle>
            <CardDescription>
              Deleting “{data.name}” also removes everything scoped to it: chats, files, knowledge
              bases and members. Only the owner can do this.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <ProjectDetailsForm project={data} />
      <MembersPanel project={data} />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/projects"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft aria-hidden className="size-4" />
      All projects
    </Link>
  );
}
