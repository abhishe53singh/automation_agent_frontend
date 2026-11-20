"use client";

import { useState } from "react";
import Link from "next/link";
import { PlusCircle, Search, Filter, Megaphone } from "lucide-react";

import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Skeleton } from "@/shared/ui/Skeleton";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";

import { useEmailCampaigns, useDeleteEmailCampaign } from "@/modules/email/hooks";
import { CampaignCard } from "@/modules/email/components/CampaignCard";

export default function CampaignsListPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: campaigns, isLoading } = useEmailCampaigns();
  const deleteMutation = useDeleteEmailCampaign();

  const filtered = (campaigns || []).filter((c) => {
    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" || c.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Campaigns
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor outreach progress, recipient delivery, and response conversion rates.
          </p>
        </div>

        <Button asChild className="gap-2">
          <Link href="/tools/email/campaigns/new">
            <PlusCircle className="h-4 w-4" />
            <span>Create Campaign</span>
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns by name..."
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sending">Sending</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-10 w-10 text-muted-foreground" />}
          title="No campaigns found"
          description={
            search || statusFilter !== "all"
              ? "No campaigns matched your search or status filter."
              : "Create your first email marketing campaign to reach your leads with personalized templates."
          }
          action={
            <Button asChild className="gap-2">
              <Link href="/tools/email/campaigns/new">
                <PlusCircle className="h-4 w-4" />
                <span>Create Campaign</span>
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              onDelete={(id) => setDeletingId(id)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deletingId)}
        onOpenChange={(open) => !open && setDeletingId(null)}
        title="Delete Outreach Campaign"
        description="Are you sure you want to delete this campaign? All unsent dispatches will be cancelled."
        confirmLabel="Delete Campaign"
        variant="destructive"
        onConfirm={async () => {
          if (deletingId) {
            await deleteMutation.mutateAsync(deletingId);
            setDeletingId(null);
          }
        }}
      />
    </div>
  );
}
