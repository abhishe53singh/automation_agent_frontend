import type { Metadata } from "next";
import { Breadcrumbs, PageHeader, Card, CardContent, CardHeader, CardTitle, CardDescription, Button } from "@/shared/ui";

export const metadata: Metadata = { title: "MCP Registry" };

export default function McpRegistryPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="MCP Server Registry"
        description="Register and inspect Model Context Protocol servers and their discovered tools."
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Integrations", href: "/integrations" },
              { label: "MCP" },
            ]}
          />
        }
      />


      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Servers</CardTitle>
              <CardDescription>
                Configured Model Context Protocol endpoints.
              </CardDescription>
            </div>
            <Button disabled>Register Server</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
            No MCP servers configured yet. Waiting for backend phase 4 integration landing.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

