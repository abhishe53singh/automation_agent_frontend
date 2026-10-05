"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { MessageSquarePlus } from "lucide-react";

import { ROLE_LABELS, canEdit } from "@/modules/projects/rbac";
import { useProject } from "@/modules/projects/hooks";
import {
  Badge,
  Breadcrumbs,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
  RouteTabs,
} from "@/shared/ui";
import { PanelSkeleton } from "@/shared/ui/AsyncBoundary";

export function ProjectWorkspaceLayout({
  projectId,
  children,
}: {
  projectId: string;
  children: React.ReactNode;
}) {
  const project = useProject(projectId);
  const pathname = usePathname();

  React.useEffect(() => {
    if (typeof window !== "undefined" && projectId) {
      try {
        localStorage.setItem("aa:lastProject", projectId);
      } catch {
        // Ignore
      }
    }
  }, [projectId]);

  if (project.isPending) return <PanelSkeleton />;
  if (project.error || !project.data) {
    return (
      <div className="max-w-4xl space-y-4">
        <Breadcrumbs
          items={[
            { label: "Projects", href: "/projects" },
            { label: "Not found" },
          ]}
        />
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
  const userCanEdit = canEdit(data);

  const tabs = [
    { href: `/projects/${projectId}` as Route, label: "Overview" },
    { href: `/projects/${projectId}/chat` as Route, label: "Chats" },
    { href: `/projects/${projectId}/members` as Route, label: "Members" },
    {
      href: `/projects/${projectId}/settings` as Route,
      label: "Settings",
      hidden: !userCanEdit,
    },
  ];

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Projects", href: "/projects" },
              { label: data.name, href: `/projects/${projectId}` },
            ]}
          />
        }
        title={data.name}
        badge={
          <Badge variant={data.role === "owner" ? "primary" : "neutral"}>
            {ROLE_LABELS[data.role]}
          </Badge>
        }
        description={data.description?.trim() || undefined}
        actions={
          <Button asChild size="sm">
            <Link href={`/projects/${projectId}/chat` as Route}>
              <MessageSquarePlus aria-hidden />
              New chat
            </Link>
          </Button>
        }
      />

      <RouteTabs tabs={tabs} />

      <div className="min-h-0">{children}</div>
    </div>
  );
}