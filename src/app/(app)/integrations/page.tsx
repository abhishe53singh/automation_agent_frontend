import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumbs, PageHeader } from "@/shared/ui";
import { GoogleConnectNotice, IntegrationsPanel } from "@/modules/integrations";
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

      {/* useSearchParams needs a Suspense boundary under static rendering. */}
      <Suspense fallback={null}>
        <GoogleConnectNotice />
      </Suspense>

      <IntegrationsPanel />

      <ApprovalConfirmationList />
    </div>
  );
}
