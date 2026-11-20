"use client";

import { Activity, CheckCircle2, XCircle, RefreshCw, AlertTriangle, ShieldCheck } from "lucide-react";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { useEmailAccountHealth, useTestEmailAccount } from "../hooks";

interface MailboxHealthCardProps {
  accountId: string;
}

export function MailboxHealthCard({ accountId }: MailboxHealthCardProps) {
  const { data: health, isLoading } = useEmailAccountHealth(accountId);
  const testMutation = useTestEmailAccount();

  if (isLoading || !health) {
    return (
      <Card className="p-5 flex items-center justify-center min-h-[160px] animate-pulse bg-muted/20">
        <span className="text-xs text-muted-foreground">Loading health metrics...</span>
      </Card>
    );
  }

  const quotaPercent = Math.min(
    100,
    Math.round((health.sends_today / Math.max(1, health.daily_send_limit)) * 100)
  );

  return (
    <Card className="p-5 space-y-4 border-border/80 bg-card">
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">
            Account Health & Quota
          </h4>
        </div>
        <Badge
          variant="outline"
          className={
            health.bounce_rate > 5
              ? "border-destructive text-destructive bg-destructive/10"
              : "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
          }
        >
          {health.reputation_score}
        </Badge>
      </div>

      {/* Quota Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-medium">
          <span className="text-muted-foreground">Daily Sending Quota</span>
          <span className="text-foreground">
            {health.sends_today} / {health.daily_send_limit} sent ({quotaPercent}%)
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              quotaPercent > 90
                ? "bg-rose-500"
                : quotaPercent > 70
                ? "bg-amber-500"
                : "bg-primary"
            }`}
            style={{ width: `${quotaPercent}%` }}
          />
        </div>
        <span className="text-[11px] text-muted-foreground">
          {health.remaining_today} emails remaining today
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
        <div className="rounded-lg border border-border/40 bg-muted/20 p-2.5">
          <span className="text-muted-foreground">Total Dispatched</span>
          <p className="mt-0.5 text-base font-bold text-foreground">
            {health.total_sent}
          </p>
        </div>
        <div className="rounded-lg border border-border/40 bg-muted/20 p-2.5">
          <span className="text-muted-foreground">Bounce Rate</span>
          <p
            className={`mt-0.5 text-base font-bold ${
              health.bounce_rate > 5 ? "text-destructive" : "text-foreground"
            }`}
          >
            {health.bounce_rate}%
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border/40">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {health.is_verified ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          )}
          <span>SMTP: {health.smtp_status}</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={testMutation.isPending}
          onClick={() => testMutation.mutate(accountId)}
          className="gap-1.5 text-xs h-8"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${testMutation.isPending ? "animate-spin" : ""}`} />
          <span>{testMutation.isPending ? "Testing..." : "Test Connection"}</span>
        </Button>
      </div>
    </Card>
  );
}
