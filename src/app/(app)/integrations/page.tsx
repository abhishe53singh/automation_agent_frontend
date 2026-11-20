import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Globe, ShieldCheck } from "lucide-react";
import {
  Breadcrumbs,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
} from "@/shared/ui";
import {
  GoogleConnectNotice,
  IntegrationsPanel,
  IntegrationsTransfer,
} from "@/modules/integrations";
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

      <IntegrationsTransfer />

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

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <div className="space-y-1">
                <CardTitle>Captcha for your websites</CardTitle>
                <CardDescription>
                  Self-hosted distorted-text captcha. Get a site key and secret, paste one script
                  tag into any website&apos;s form, and verify tokens from its server.
                </CardDescription>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/integrations/captcha">Manage captcha</Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      <ApprovalConfirmationList />
    </div>
  );
}
