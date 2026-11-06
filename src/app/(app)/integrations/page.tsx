import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Globe } from "lucide-react";
import {
  Breadcrumbs,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
} from "@/shared/ui";
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

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Globe className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <div className="space-y-1">
                <CardTitle>Website chat widget</CardTitle>
                <CardDescription>
                  Put a project&apos;s assistant on your own website. Open a project and choose the
                  Website widget tab to create one and copy the embed code.
                </CardDescription>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/projects">Go to projects</Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      <ApprovalConfirmationList />
    </div>
  );
}
