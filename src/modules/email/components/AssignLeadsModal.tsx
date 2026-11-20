"use client";

import { useMemo, useState } from "react";
import {
  UserPlus,
  Search,
  Check,
  Building,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Users,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/ui/Dialog";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Badge } from "@/shared/ui/Badge";
import { Skeleton } from "@/shared/ui/Skeleton";
import {
  useEmailLeads,
  useEmailLeadLists,
  useAssignLeadsToCampaign,
} from "../hooks";

interface AssignLeadsModalProps {
  campaignId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingLeadIds: Set<string>;
  onSuccess?: () => void;
}

export function AssignLeadsModal({
  campaignId,
  open,
  onOpenChange,
  existingLeadIds,
  onSuccess,
}: AssignLeadsModalProps) {
  const [search, setSearch] = useState("");
  const [selectedListId, setSelectedListId] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: allLeads, isLoading: leadsLoading } = useEmailLeads();
  const { data: leadLists } = useEmailLeadLists();
  const assignMutation = useAssignLeadsToCampaign(campaignId);

  // Filter leads based on search and selected list
  const filteredLeads = useMemo(() => {
    if (!allLeads) return [];
    return allLeads.filter((lead) => {
      const matchesList =
        selectedListId === "all" || lead.list_id === selectedListId;

      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        lead.email.toLowerCase().includes(q) ||
        (lead.first_name && lead.first_name.toLowerCase().includes(q)) ||
        (lead.last_name && lead.last_name.toLowerCase().includes(q)) ||
        (lead.company && lead.company.toLowerCase().includes(q));

      return matchesList && matchesSearch;
    });
  }, [allLeads, selectedListId, search]);

  // Candidates that are active and not already in this campaign
  const selectableLeads = useMemo(() => {
    return filteredLeads.filter(
      (l) => !existingLeadIds.has(l.id) && l.status === "active"
    );
  }, [filteredLeads, existingLeadIds]);

  const allSelected =
    selectableLeads.length > 0 &&
    selectableLeads.every((l) => selectedIds.has(l.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      const next = new Set(selectedIds);
      selectableLeads.forEach((l) => next.add(l.id));
      setSelectedIds(next);
    }
  };

  const toggleSelectLead = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleAssignSelected = async () => {
    if (selectedIds.size === 0) return;
    try {
      await assignMutation.mutateAsync({
        lead_ids: Array.from(selectedIds),
      });
      setSelectedIds(new Set());
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch {
      // Error handled by hook toast
    }
  };

  const handleAssignAllActive = async () => {
    try {
      if (selectedListId !== "all") {
        await assignMutation.mutateAsync({ list_id: selectedListId });
      } else {
        await assignMutation.mutateAsync({ all_leads: true });
      }
      setSelectedIds(new Set());
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch {
      // Error handled by hook toast
    }
  };

  const totalActiveInAccount =
    allLeads?.filter((l) => l.status === "active" && !existingLeadIds.has(l.id))
      .length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-5 border-b border-border bg-card/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <span>Add Contacts from All Leads</span>
                <Badge variant="outline" className="text-[11px] font-normal py-0">
                  {allLeads?.length || 0} Total in Audience
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Select specific contacts or assign an entire lead list to this campaign.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Toolbar: List Filter & Search */}
        <div className="px-5 py-3 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, company..."
              className="pl-8 text-xs h-8"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0 hidden sm:block" />
            <select
              value={selectedListId}
              onChange={(e) => {
                setSelectedListId(e.target.value);
                setSelectedIds(new Set());
              }}
              className="h-8 rounded-md border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-auto"
            >
              <option value="all">All Lists ({allLeads?.length || 0})</option>
              {leadLists?.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name} ({list.lead_count || 0})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selection summary bar */}
        <div className="px-5 py-2 bg-muted/10 border-b border-border/40 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="select-all"
              checked={allSelected}
              onChange={toggleSelectAll}
              disabled={selectableLeads.length === 0}
              className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
            />
            <label htmlFor="select-all" className="cursor-pointer select-none">
              Select All Filtered ({selectableLeads.length} available)
            </label>
          </div>

          <div>
            <strong>{selectedIds.size}</strong> selected
          </div>
        </div>

        {/* Table list */}
        <div className="flex-1 overflow-y-auto max-h-[360px] p-0 divide-y divide-border/50">
          {leadsLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
              <Users className="h-8 w-8 mx-auto text-muted-foreground/60" />
              <p>No matching contacts found in your audience.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border text-[11px] font-semibold sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="w-10 px-4 py-2 text-center"></th>
                  <th className="px-4 py-2">Contact</th>
                  <th className="px-4 py-2">Company & Title</th>
                  <th className="px-4 py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-sans">
                {filteredLeads.map((lead) => {
                  const isExisting = existingLeadIds.has(lead.id);
                  const isSelected = selectedIds.has(lead.id);
                  const fullName = [lead.first_name, lead.last_name]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => !isExisting && toggleSelectLead(lead.id)}
                      className={`transition-colors ${
                        isExisting
                          ? "opacity-50 bg-muted/10 cursor-not-allowed"
                          : "hover:bg-muted/30 cursor-pointer"
                      } ${isSelected ? "bg-primary/5" : ""}`}
                    >
                      <td className="w-10 px-4 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected || isExisting}
                          disabled={isExisting}
                          onChange={() => !isExisting && toggleSelectLead(lead.id)}
                          className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-foreground">
                          {lead.email}
                        </div>
                        {fullName && (
                          <div className="text-[11px] text-muted-foreground">
                            {fullName}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {lead.company && (
                          <div className="text-foreground font-medium flex items-center gap-1">
                            <Building className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span>{lead.company}</span>
                          </div>
                        )}
                        {lead.title && (
                          <div className="text-[11px] text-muted-foreground">
                            {lead.title}
                          </div>
                        )}
                        {!lead.company && !lead.title && "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {isExisting ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] py-0 border-primary/30 text-primary bg-primary/5"
                          >
                            Already Added
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className={
                              lead.status === "active"
                                ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-[10px] py-0"
                                : "text-[10px] py-0"
                            }
                          >
                            {lead.status}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-border bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {totalActiveInAccount > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAssignAllActive}
                disabled={assignMutation.isPending}
                className="text-xs h-8 gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>
                  {selectedListId !== "all"
                    ? "Add Entire Selected List"
                    : `Add All Active (${totalActiveInAccount})`}
                </span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAssignSelected}
              disabled={selectedIds.size === 0 || assignMutation.isPending}
              className="gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {assignMutation.isPending
                  ? "Adding..."
                  : `Add Selected (${selectedIds.size})`}
              </span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
