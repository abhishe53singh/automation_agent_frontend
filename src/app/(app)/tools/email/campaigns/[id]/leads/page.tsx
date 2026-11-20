"use client";

import { use, useMemo, useState } from "react";
import { UserPlus, Upload } from "lucide-react";

import { Button } from "@/shared/ui/Button";
import { Skeleton } from "@/shared/ui/Skeleton";
import { useCampaignLeads } from "@/modules/email/hooks";
import { CampaignLeadTable } from "@/modules/email/components/CampaignLeadTable";
import { AssignLeadsModal } from "@/modules/email/components/AssignLeadsModal";
import { ImportWizard } from "@/modules/email/components/ImportWizard";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CampaignLeadsSubTabPage({ params }: PageProps) {
  const { id: campaignId } = use(params);
  const [importOpen, setImportOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const { data: leads, isLoading, refetch } = useCampaignLeads(campaignId);

  const existingLeadIds = useMemo(() => {
    return new Set<string>(leads?.map((l: any) => l.lead_id) || []);
  }, [leads]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Campaign Recipients ({leads?.length || 0})
          </h2>
          <p className="text-sm text-muted-foreground">
            Leads assigned to this campaign and their engagement journey through the pipeline.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setAssignOpen(true)}
            className="gap-1.5"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add from All Leads</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setImportOpen(true)}
            className="gap-1.5"
          >
            <Upload className="h-4 w-4" />
            <span>Import CSV</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <CampaignLeadTable
          campaignId={campaignId}
          leads={leads || []}
          onOpenAssign={() => setImportOpen(true)}
          onOpenAssignLeads={() => setAssignOpen(true)}
        />
      )}

      <AssignLeadsModal
        campaignId={campaignId}
        open={assignOpen}
        onOpenChange={setAssignOpen}
        existingLeadIds={existingLeadIds}
        onSuccess={() => refetch()}
      />

      <ImportWizard
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
