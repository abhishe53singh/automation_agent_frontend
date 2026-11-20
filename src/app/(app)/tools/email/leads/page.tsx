"use client";

import { useState } from "react";
import { Users, Upload, Download, TableProperties } from "lucide-react";

import { Button } from "@/shared/ui/Button";
import { Skeleton } from "@/shared/ui/Skeleton";
import { useEmailLeads } from "@/modules/email/hooks";
import { LeadTable } from "@/modules/email/components/LeadTable";
import { ImportWizard } from "@/modules/email/components/ImportWizard";
import { ManualLeadSheet } from "@/modules/email/components/ManualLeadSheet";

export default function AllLeadsPage() {
  const [viewMode, setViewMode] = useState<"table" | "sheet">("table");
  const [importOpen, setImportOpen] = useState(false);
  const { data: leads, isLoading, refetch } = useEmailLeads();

  const handleExport = () => {
    window.open("/api/email/email-leads/export", "_blank");
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            All Leads
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your audience, contact lists, manual spreadsheet entries, and CSV/Excel data imports.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* In-page View Switcher */}
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === "table"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Contacts List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("sheet")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === "sheet"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TableProperties className="h-3.5 w-3.5 text-primary" />
              <span>Spreadsheet Entry</span>
            </button>
          </div>

          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>
          <Button onClick={() => setImportOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            <span>Import CSV / Excel</span>
          </Button>
        </div>
      </div>

      {/* Main Content: In-Page Sheet vs Contacts Table */}
      {viewMode === "sheet" ? (
        <ManualLeadSheet
          onClose={() => setViewMode("table")}
          onSuccess={() => {
            refetch();
            setViewMode("table");
          }}
        />
      ) : isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <LeadTable
          leads={leads || []}
          onOpenImport={() => setImportOpen(true)}
          onOpenManualSheet={() => setViewMode("sheet")}
        />
      )}

      {/* Import Modal */}
      <ImportWizard
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
