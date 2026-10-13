import type { Metadata } from "next";
import { Breadcrumbs, PageHeader, Card, CardContent, CardHeader, CardTitle, CardDescription, Button } from "@/shared/ui";
import Link from "next/link";

export const metadata: Metadata = { title: "Integrations" };

export default function IntegrationsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="Integrations & Tools"
        description="Connect OAuth providers, Google Workspace APIs, and Model Context Protocol (MCP) servers."
        breadcrumbs={<Breadcrumbs items={[{ label: "Integrations" }]} />}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Google Workspace</CardTitle>
            <CardDescription>
              Connect Gmail, Google Calendar, Google Docs, and Google Sheets.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Authorize read and write access to your Google account securely using OAuth 2.0.
            </p>
            <Button asChild>
              <a href="/api/integrations/google/authorize">Connect Google Account</a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Model Context Protocol (MCP)</CardTitle>
            <CardDescription>
              Register local or remote MCP servers to expose external tools to agents.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure command-line MCP servers, tool execution permissions, and approval flows.
            </p>
            <Button variant="outline" asChild>
              <a href="/integrations/mcp">Manage MCP Registry</a>
            </Button>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

