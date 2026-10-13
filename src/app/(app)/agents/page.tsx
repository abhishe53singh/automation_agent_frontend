import type { Metadata } from "next";
import { Breadcrumbs, PageHeader, Card, CardContent, CardHeader, CardTitle, CardDescription, Button } from "@/shared/ui";

export const metadata: Metadata = { title: "Agents" };

export default function AgentsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="Agent Definitions"
        description="Configure autonomous agents, system prompts, model allocations, and tool permissions."
        breadcrumbs={<Breadcrumbs items={[{ label: "Agents" }]} />}
      />


      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Autonomous Agents</CardTitle>
              <CardDescription>
                Define persona, capabilities, and execution boundaries.
              </CardDescription>
            </div>
            <Button disabled>Create Agent</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
            No agents configured yet. Backend phase 5 (Agent definitions & runs) is staged.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

