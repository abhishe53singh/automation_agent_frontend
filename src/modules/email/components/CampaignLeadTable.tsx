"use client";

import { Eye, MousePointerClick, MessageSquare, Send, UserPlus, Upload, Trash2 } from "lucide-react";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { useUpdateCampaignLeadStage, useRemoveLeadFromCampaign } from "../hooks";

interface CampaignLeadTableProps {
  campaignId: string;
  leads: any[];
  onOpenAssign?: () => void;
  onOpenAssignLeads?: () => void;
}

export function CampaignLeadTable({
  campaignId,
  leads,
  onOpenAssign,
  onOpenAssignLeads,
}: CampaignLeadTableProps) {
  const updateStageMutation = useUpdateCampaignLeadStage(campaignId);
  const removeMutation = useRemoveLeadFromCampaign(campaignId);

  if (!leads || leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-border bg-card/30">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
          <Send className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          No leads assigned to this campaign
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          Add existing contacts from your All Leads audience or import a fresh CSV/Excel spreadsheet to begin outreach.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {onOpenAssignLeads && (
            <Button onClick={onOpenAssignLeads} className="gap-2 shadow-sm">
              <UserPlus className="h-4 w-4" />
              <span>Add from All Leads</span>
            </Button>
          )}
          {onOpenAssign && (
            <Button variant="outline" onClick={onOpenAssign} className="gap-2">
              <Upload className="h-4 w-4" />
              <span>Import CSV / Excel</span>
            </Button>
          )}
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
        return <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-[10px]">Delivered</Badge>;
      case "bounced":
        return <Badge variant="outline" className="border-destructive text-destructive bg-destructive/10 text-[10px]">Bounced</Badge>;
      case "failed":
        return <Badge variant="outline" className="border-rose-500/30 text-rose-600 bg-rose-500/10 text-[10px]">Failed</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">Queued</Badge>;
    }
  };

  return (
    <Card className="overflow-hidden border border-border">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 text-muted-foreground border-b border-border font-medium">
            <tr>
              <th className="px-4 py-3">Recipient</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Send Status</th>
              <th className="px-4 py-3">Pipeline Stage</th>
              <th className="px-4 py-3 text-center">Engagement</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {leads.map((lead) => {
              const fullName = [lead.first_name, lead.last_name]
                .filter(Boolean)
                .join(" ");

              return (
                <tr key={lead.lead_id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-foreground">{lead.email}</div>
                    {fullName && (
                      <div className="text-muted-foreground text-[11px]">{fullName}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {lead.company || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(lead.send_status)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={lead.pipeline_stage}
                      onChange={(e) =>
                        updateStageMutation.mutate({
                          leadId: lead.lead_id,
                          stage: e.target.value,
                        })
                      }
                      className="h-7 rounded border border-border bg-background px-2 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="queued">Queued</option>
                      <option value="contacted">Contacted</option>
                      <option value="opened">Opened</option>
                      <option value="replied">Replied</option>
                      <option value="interested">Interested</option>
                      <option value="meeting_booked">Meeting Booked</option>
                      <option value="converted">Converted</option>
                      <option value="not_interested">Not Interested</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-3 text-muted-foreground text-[11px]">
                      <span className="flex items-center gap-1" title="Open count">
                        <Eye className={`h-3.5 w-3.5 ${lead.open_count > 0 ? "text-amber-500 font-bold" : ""}`} />
                        <span>{lead.open_count}</span>
                      </span>
                      <span className="flex items-center gap-1" title="Click count">
                        <MousePointerClick className={`h-3.5 w-3.5 ${lead.click_count > 0 ? "text-blue-500 font-bold" : ""}`} />
                        <span>{lead.click_count}</span>
                      </span>
                      {lead.replied_at && (
                        <span className="flex items-center gap-1 text-emerald-500 font-semibold" title="Replied">
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>Replied</span>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {lead.send_status === "queued" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Remove ${lead.email} from this campaign?`)) {
                            removeMutation.mutate(lead.lead_id);
                          }
                        }}
                        disabled={removeMutation.isPending}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        title="Remove from campaign"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
