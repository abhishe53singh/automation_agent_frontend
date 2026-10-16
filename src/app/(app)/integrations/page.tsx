import type { Metadata } from "next";
import { Breadcrumbs, PageHeader } from "@/shared/ui";
import { IntegrationsPanel } from "@/modules/integrations";
import { ApprovalConfirmationList } from "@/modules/mcp";

export const metadata: Metadata = { title: "Integrations & Tools" };

export default function IntegrationsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="Integrations & Tools"
        description="Connect OAuth providers, Google Workspace APIs, and Model Context Protocol (MCP) servers."
        breadcrumbs={<Breadcrumbs items={[{ label: "Integrations" }]} />}
      />

      <IntegrationsPanel />

      <ApprovalConfirmationList />
    </div>
  );
}
