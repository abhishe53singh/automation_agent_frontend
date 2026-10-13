import type { Metadata } from "next";
import { Breadcrumbs, PageHeader, Card, CardContent, CardHeader, CardTitle, CardDescription, Button } from "@/shared/ui";

export const metadata: Metadata = { title: "Workflows" };

export default function WorkflowsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="Workflows & Automations"
        description="Design multi-step pipelines, automated tasks, triggers, schedules, and agent handoffs."
        breadcrumbs={<Breadcrumbs items={[{ label: "Workflows" }]} />}
      />


      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pipelines</CardTitle>
              <CardDescription>
                Stateful step sequences with condition and loop logic.
              </CardDescription>
            </div>
            <Button disabled>Create Workflow</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
            No workflows created yet. Backend phase 6 (Workflows & schedules) is staged.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

