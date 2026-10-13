"use client";

import {
  DocumentsPanel,
  FilesPanel,
  KnowledgeBasesPanel,
  SearchPanel,
} from "@/modules/knowledge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui";

/**
 * Project Knowledge tab (phase_5.txt items 39-47).
 * Encapsulates Files, Documents, Knowledge Bases, and Search scoped to a project.
 */
export function ProjectKnowledgeTab({ projectId }: { projectId: string }) {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="files">
        <TabsList>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="knowledge-bases">Knowledge Bases</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
        </TabsList>
        <TabsContent value="files" className="mt-4">
          <FilesPanel projectId={projectId} />
        </TabsContent>
        <TabsContent value="documents" className="mt-4">
          <DocumentsPanel projectId={projectId} />
        </TabsContent>
        <TabsContent value="knowledge-bases" className="mt-4">
          <KnowledgeBasesPanel projectId={projectId} />
        </TabsContent>
        <TabsContent value="search" className="mt-4">
          <SearchPanel projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
