"use client";

import { use } from "react";
import { Download } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { Skeleton } from "@/shared/ui/Skeleton";
import { useEmailCampaignSends } from "@/modules/email/hooks";
import { SendLogTable } from "@/modules/email/components/SendLogTable";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CampaignSendsSubTabPage({ params }: PageProps) {
  const { id: campaignId } = use(params);
  const { data: sends, isLoading } = useEmailCampaignSends(campaignId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Dispatched Emails Log ({sends?.length || 0})
          </h2>
          <p className="text-sm text-muted-foreground">
            Real-time audit history of every message sent, delivery timestamps, open triggers, and click events.
          </p>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <SendLogTable sends={sends || []} />
      )}
    </div>
  );
}
