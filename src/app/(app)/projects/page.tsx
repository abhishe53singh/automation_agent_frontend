import type { Metadata } from "next";

import { CreateProjectDialog } from "@/modules/projects/components/CreateProjectDialog";
import { ProjectsList } from "@/modules/projects/components/ProjectsList";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Projects group your chats, files and knowledge bases, and control who can see them.
          </p>
        </div>
        <CreateProjectDialog />
      </div>

      <ProjectsList />
    </div>
  );
}
