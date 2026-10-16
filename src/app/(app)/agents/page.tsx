import type { Metadata } from "next";
import { Breadcrumbs, PageHeader } from "@/shared/ui";
import { AgentsPanel } from "@/modules/agents";

export const metadata: Metadata = { title: "Agents" };

export default function AgentsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="Agent Definitions"
        description="Configure autonomous agents, system prompts, model allocations, and tool permissions."
        breadcrumbs={<Breadcrumbs items={[{ label: "Agents" }]} />}
      />

      <AgentsPanel />
    </div>
  );
}
