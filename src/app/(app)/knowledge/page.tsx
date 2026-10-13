import type { Metadata } from "next";

import { FilesPanel, DocumentsPanel, KnowledgeBasesPanel, SearchPanel } from "@/modules/knowledge";
import { Breadcrumbs, PageHeader, Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui";

export const metadata: Metadata = { title: "Knowledge" };

/** Cross-project knowledge hub (phase_5.txt items 39-47). */
export default function KnowledgePage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="Knowledge"
        description="Files, documents, knowledge bases and semantic search."
        breadcrumbs={<Breadcrumbs items={[{ label: "Knowledge" }]} />}
      />
      <Tabs defaultValue="files">
        <TabsList>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="knowledge-bases">Knowledge Bases</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
        </TabsList>
        <TabsContent value="files" className="mt-4">
          <FilesPanel />
        </TabsContent>
        <TabsContent value="documents" className="mt-4">
          <DocumentsPanel />
        </TabsContent>
        <TabsContent value="knowledge-bases" className="mt-4">
          <KnowledgeBasesPanel />
        </TabsContent>
        <TabsContent value="search" className="mt-4">
          <SearchPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
