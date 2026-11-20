"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { CampaignWizard } from "@/modules/email/components/CampaignWizard";

export default function NewCampaignWizardPage() {
  return (
    <div className="flex-1 space-y-6 p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
          <Link href="/tools/email">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Campaigns</span>
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Create New Campaign
        </h1>
        <p className="text-sm text-muted-foreground">
          Step-by-step setup for lead targeting, template selection, and mailbox delivery.
        </p>
      </div>

      <CampaignWizard />
    </div>
  );
}
