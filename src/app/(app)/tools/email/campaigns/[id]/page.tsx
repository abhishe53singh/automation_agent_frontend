"use client";

import { use } from "react";
import { Users, Send, Eye, MousePointerClick, MessageSquare, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card } from "@/shared/ui/Card";
import { Skeleton } from "@/shared/ui/Skeleton";
import { useEmailCampaign } from "@/modules/email/hooks";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CampaignOverviewPage({ params }: PageProps) {
  const { id: campaignId } = use(params);
  const { data: campaign, isLoading } = useEmailCampaign(campaignId);

  if (isLoading || !campaign) {
    return <Skeleton className="h-96 rounded-xl" />;
  }

  const delivered = campaign.delivered_count || 0;
  const openRate = delivered > 0 ? Math.round((campaign.opened_count / delivered) * 100) : 0;
  const clickRate = delivered > 0 ? Math.round((campaign.clicked_count / delivered) * 100) : 0;
  const replyRate = delivered > 0 ? Math.round((campaign.replied_count / delivered) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4 flex flex-col justify-between border-border">
          <span className="text-xs font-medium text-muted-foreground">Recipients</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-foreground">{campaign.total_recipients}</span>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="text-[11px] text-muted-foreground mt-1">Queued audience</span>
        </Card>

        <Card className="p-4 flex flex-col justify-between border-border">
          <span className="text-xs font-medium text-muted-foreground">Sent</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-foreground">{campaign.sent_count}</span>
            <Send className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="text-[11px] text-muted-foreground mt-1">{campaign.delivered_count} delivered</span>
        </Card>

        <Card className="p-4 flex flex-col justify-between border-border">
          <span className="text-xs font-medium text-muted-foreground">Opened</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-foreground">{campaign.opened_count}</span>
            <Eye className="h-4 w-4 text-amber-500" />
          </div>
          <span className="text-[11px] text-amber-500 font-semibold mt-1">{openRate}% open rate</span>
        </Card>

        <Card className="p-4 flex flex-col justify-between border-border">
          <span className="text-xs font-medium text-muted-foreground">Clicked</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-foreground">{campaign.clicked_count}</span>
            <MousePointerClick className="h-4 w-4 text-blue-500" />
          </div>
          <span className="text-[11px] text-blue-500 font-semibold mt-1">{clickRate}% click rate</span>
        </Card>

        <Card className="p-4 flex flex-col justify-between border-border">
          <span className="text-xs font-medium text-muted-foreground">Replied</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-foreground">{campaign.replied_count}</span>
            <MessageSquare className="h-4 w-4 text-emerald-500" />
          </div>
          <span className="text-[11px] text-emerald-500 font-semibold mt-1">{replyRate}% response rate</span>
        </Card>
      </div>

      {/* Funnel & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4 border-border">
          <h3 className="text-base font-semibold text-foreground">Outreach Conversion Funnel</h3>
          <div className="space-y-3 pt-2 text-xs">
            <div>
              <div className="flex justify-between py-1 font-medium">
                <span className="text-muted-foreground">Sent ({campaign.sent_count})</span>
                <span className="text-foreground">100%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary" style={{ width: "100%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between py-1 font-medium">
                <span className="text-muted-foreground">Delivered ({campaign.delivered_count})</span>
                <span className="text-foreground">
                  {campaign.sent_count > 0 ? Math.round((campaign.delivered_count / campaign.sent_count) * 100) : 0}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${campaign.sent_count > 0 ? Math.round((campaign.delivered_count / campaign.sent_count) * 100) : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between py-1 font-medium">
                <span className="text-muted-foreground">Opened ({campaign.opened_count})</span>
                <span className="text-foreground">{openRate}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-amber-500" style={{ width: `${openRate}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between py-1 font-medium">
                <span className="text-muted-foreground">Replied ({campaign.replied_count})</span>
                <span className="text-foreground">{replyRate}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-teal-500" style={{ width: `${replyRate}%` }} />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4 border-border">
          <h3 className="text-base font-semibold text-foreground">Campaign Configuration</h3>
          <div className="divide-y divide-border/40 text-xs">
            <div className="py-2.5 flex justify-between">
              <span className="text-muted-foreground">Assigned Mailbox:</span>
              <span className="font-semibold text-foreground">{campaign.account_label || campaign.account_from_email || "None"}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-muted-foreground">Template:</span>
              <span className="font-semibold text-foreground">{campaign.template_name || "None"}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-muted-foreground">Lead Audience List:</span>
              <span className="font-semibold text-foreground">{campaign.list_name || "Ad-hoc / Manual"}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-muted-foreground">Sending Throttle:</span>
              <span className="font-semibold text-foreground">{campaign.batch_size} emails / {campaign.batch_delay_seconds}s</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-muted-foreground">Kanban Auto-Progression:</span>
              <span className="font-semibold text-emerald-600">
                {campaign.kanban_auto_assign ? "Enabled (Auto)" : "Manual Only"}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
