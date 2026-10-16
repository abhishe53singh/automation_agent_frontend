import type { Metadata } from "next";
import { Breadcrumbs, PageHeader } from "@/shared/ui";
import { McpServerList, ApprovalConfirmationList } from "@/modules/mcp";

export const metadata: Metadata = { title: "MCP Registry" };

export default function McpRegistryPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="MCP Server Registry"
        description="Register and inspect Model Context Protocol servers, configure tool permissions, and review approvals."
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Integrations", href: "/integrations" },
              { label: "MCP Registry" },
            ]}
          />
        }
      />

      <McpServerList />

      <ApprovalConfirmationList />
    </div>
  );
}
