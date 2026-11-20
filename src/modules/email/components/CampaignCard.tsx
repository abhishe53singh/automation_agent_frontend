"use client";

import Link from "next/link";
import { Megaphone, Play, Pause, Copy, Trash2, ArrowRight, Eye, MessageSquare, Send } from "lucide-react";

import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";

import type { EmailCampaignOut } from "../schemas";
import { useStartEmailCampaign, usePauseEmailCampaign, useResumeEmailCampaign, useCloneEmailCampaign } from "../hooks";

interface CampaignCardProps {
  campaign: EmailCampaignOut;
  onDelete?: (id: string) => void;
}

export function CampaignCard({ campaign, onDelete }: CampaignCardProps) {
  const startMutation = useStartEmailCampaign(campaign.id);
  const pauseMutation = usePauseEmailCampaign(campaign.id);
  const resumeMutation = useResumeEmailCampaign(campaign.id);
  const cloneMutation = useCloneEmailCampaign();

  const total = Math.max(1, campaign.total_recipients);
  const percent = Math.min(100, Math.round((campaign.sent_count / total) * 100));

  const openRate = campaign.delivered_count > 0
    ? Math.round((campaign.opened_count / campaign.delivered_count) * 100)
    : 0;

  const replyRate = campaign.delivered_count > 0
    ? Math.round((campaign.replied_count / campaign.delivered_count) * 100)
    : 0;

  const getStatusBadge = (s: string) => {
    switch (s.toLowerCase()) {
      case "sending":
        return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[11px] py-0">🟢 Sending</Badge>;
      case "scheduled":
        return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[11px] py-0">🟡 Scheduled</Badge>;
      case "paused":
        return <Badge className="bg-orange-500/15 text-orange-600 border-orange-500/30 text-[11px] py-0">⏸️ Paused</Badge>;
      case "completed":
        return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 text-[11px] py-0">✅ Completed</Badge>;
      default:
        return <Badge variant="secondary" className="text-[11px] py-0">Draft</Badge>;
    }
  };

  return (
    <Card className="flex flex-col justify-between p-5 border border-border hover:border-primary/50 transition-all shadow-sm">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Megaphone className="h-4 w-4" />
            </div>
            <h3 className="font-semibold text-foreground text-sm truncate">
              {campaign.name}
            </h3>
          </div>
          {getStatusBadge(campaign.status)}
        </div>

        {campaign.description && (
          <p className="text-xs text-muted-foreground line-clamp-1">
            {campaign.description}
          </p>
        )}

        {/* Progress Bar */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
            <span>Progress</span>
            <span className="text-foreground">{campaign.sent_count} / {campaign.total_recipients} ({percent}%)</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
          <div className="rounded-md border border-border/40 bg-muted/20 p-2">
            <span className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
              <Send className="h-2.5 w-2.5" /> Sent
            </span>
            <span className="font-bold text-foreground text-sm">{campaign.sent_count}</span>
          </div>
          <div className="rounded-md border border-border/40 bg-muted/20 p-2">
            <span className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
              <Eye className="h-2.5 w-2.5" /> Opened
            </span>
            <span className="font-bold text-foreground text-sm">{openRate}%</span>
          </div>
          <div className="rounded-md border border-border/40 bg-muted/20 p-2">
            <span className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
              <MessageSquare className="h-2.5 w-2.5" /> Replied
            </span>
            <span className="font-bold text-foreground text-sm">{replyRate}%</span>
          </div>
        </div>
      </div>

      {/* Actions Footer */}
      <div className="mt-5 pt-3 border-t border-border/40 flex items-center justify-between">
        <Button asChild size="sm" variant="default" className="gap-1.5 text-xs h-8">
          <Link href={`/tools/email/campaigns/${campaign.id}`}>
            <span>Open Workspace</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>

        <div className="flex items-center gap-1">
          {campaign.status === "sending" ? (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs text-amber-600 gap-1"
              onClick={() => pauseMutation.mutate()}
            >
              <Pause className="h-3.5 w-3.5" />
              <span>Pause</span>
            </Button>
          ) : campaign.status === "paused" ? (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs text-emerald-600 gap-1"
              onClick={() => resumeMutation.mutate()}
            >
              <Play className="h-3.5 w-3.5" />
              <span>Resume</span>
            </Button>
          ) : campaign.status === "draft" ? (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs text-emerald-600 gap-1"
              onClick={() => startMutation.mutate()}
            >
              <Play className="h-3.5 w-3.5" />
              <span>Start</span>
            </Button>
          ) : null}

          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => cloneMutation.mutate(campaign.id)}
            title="Clone campaign"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>

          {onDelete && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(campaign.id)}
              title="Delete campaign"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
