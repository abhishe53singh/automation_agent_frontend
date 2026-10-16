import type { Metadata } from "next";
import { Breadcrumbs, PageHeader } from "@/shared/ui";
import { WorkflowsPanel } from "@/modules/workflows";

export const metadata: Metadata = { title: "Workflows" };

export default function WorkflowsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="Workflows & Automations"
        description="Design multi-step pipelines, automated tasks, triggers, schedules, and agent handoffs."
        breadcrumbs={<Breadcrumbs items={[{ label: "Workflows" }]} />}
      />

      <WorkflowsPanel />
    </div>
  );
}
