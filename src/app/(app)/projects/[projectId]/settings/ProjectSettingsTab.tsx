"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";

import { useProject, useDeleteProject } from "@/modules/projects/hooks";
import { canDelete, canEdit } from "@/modules/projects/rbac";
import { ProjectDetailsForm } from "@/modules/projects/components/ProjectDetailsForm";
import {
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
} from "@/shared/ui";
import { PanelSkeleton } from "@/shared/ui/AsyncBoundary";

export function ProjectSettingsTab({ projectId }: { projectId: string }) {
  const { data: project, isPending } = useProject(projectId);
  const remove = useDeleteProject(projectId);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  if (isPending) return <PanelSkeleton />;
  if (!project) return null;

  const deletable = canDelete(project);
  const editable = canEdit(project);

  return (
    <div className="space-y-6">
      <ProjectDetailsForm project={project} />

      {deletable ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="text-destructive">Delete project</CardTitle>
                <CardDescription>
                  Permanently delete this project and all its chats, files and member associations.
                  This cannot be undone.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 aria-hidden />
                Delete project
              </Button>
            </div>
          </CardHeader>

          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title={`Delete "${project.name}"?`}
            description="This removes everything scoped to this project: chats, turns, messages, and member associations. Only the owner can do this. This cannot be undone."
            confirmLabel="Delete permanently"
            variant="destructive"
            loading={remove.isPending}
            onConfirm={() => {
              remove.mutate();
            }}
          />
        </Card>
      ) : null}
    </div>
  );
}
