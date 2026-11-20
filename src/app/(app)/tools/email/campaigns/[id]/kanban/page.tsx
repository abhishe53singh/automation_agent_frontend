"use client";

import { use } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { Skeleton } from "@/shared/ui/Skeleton";
import { KanbanBoard } from "@/modules/email/components/KanbanBoard";
import { useEmailCampaignKanban } from "@/modules/email/hooks";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CampaignKanbanSubTabPage({ params }: PageProps) {
  const { id } = use(params);
  const { data: kanbanData, isLoading, refetch, isRefetching } = useEmailCampaignKanban(id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Lead Pipeline (Kanban)
          </h2>
          <p className="text-sm text-muted-foreground">
            Automated stage progression triggered by delivery, opens, and replies, plus drag-and-drop or manual override.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 py-1 text-xs">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Auto-assignment: Enabled</span>
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            <span>Refresh Board</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
        <KanbanBoard campaignId={id} kanbanData={kanbanData} />
      )}
    </div>
  );
}
