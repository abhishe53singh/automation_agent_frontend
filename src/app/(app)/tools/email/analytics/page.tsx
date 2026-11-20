"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BarChart2,
  TrendingUp,
  Download,
  Mail,
  Eye,
  MousePointerClick,
  MessageSquare,
  AlertTriangle,
  ArrowRight,
  Flame,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { Skeleton } from "@/shared/ui/Skeleton";
import { EmptyState } from "@/shared/ui/EmptyState";
import {
  useEmailAnalyticsOverview,
  useEmailAnalyticsTimeline,
  useEmailTopPerformingCampaigns,
  useEmailPipelineSummary,
} from "@/modules/email/hooks";

export default function AnalyticsPage() {
  const { data: overview, isLoading: overviewLoading } = useEmailAnalyticsOverview();
  const { data: timeline, isLoading: timelineLoading } = useEmailAnalyticsTimeline(14);
  const { data: topCampaigns, isLoading: topLoading } = useEmailTopPerformingCampaigns(5);
  const { data: pipeline, isLoading: pipelineLoading } = useEmailPipelineSummary();

  const handleExportCsv = () => {
    if (!overview) return;
    const rows = [
      ["Metric", "Value"],
      ["Total Campaigns", overview.total_campaigns],
      ["Active Campaigns", overview.active_campaigns],
      ["Total Leads", overview.total_leads],
      ["Total Sent", overview.total_sent],
      ["Total Delivered", overview.total_delivered],
      ["Total Opened", overview.total_opened],
      ["Total Clicked", overview.total_clicked],
      ["Total Replied", overview.total_replied],
      ["Total Bounced", overview.total_bounced],
      ["Open Rate (%)", overview.open_rate_pct],
      ["Click Rate (%)", overview.click_rate_pct],
      ["Reply Rate (%)", overview.reply_rate_pct],
      ["Bounce Rate (%)", overview.bounce_rate_pct],
    ];
    const csvContent =
      "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `email_analytics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasData = overview && overview.total_sent > 0;

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Email Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Cross-campaign performance metrics, funnel conversion rates, and pipeline ROI.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          disabled={!hasData}
          className="gap-1.5"
        >
          <Download className="h-4 w-4" />
          <span>Export Summary (CSV)</span>
        </Button>
      </div>

      {overviewLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="p-4 space-y-2 border-border/80">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Total Emails Sent</span>
              <Mail className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight">
              {overview?.total_sent.toLocaleString() || 0}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {overview?.total_delivered.toLocaleString() || 0} delivered
            </p>
          </Card>

          <Card className="p-4 space-y-2 border-border/80">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Open Rate</span>
              <Eye className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {overview?.open_rate_pct || 0}%
            </div>
            <p className="text-[11px] text-muted-foreground">
              {overview?.total_opened.toLocaleString() || 0} unique opens
            </p>
          </Card>

          <Card className="p-4 space-y-2 border-border/80">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Click Rate</span>
              <MousePointerClick className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-primary">
              {overview?.click_rate_pct || 0}%
            </div>
            <p className="text-[11px] text-muted-foreground">
              {overview?.total_clicked.toLocaleString() || 0} link clicks
            </p>
          </Card>

          <Card className="p-4 space-y-2 border-border/80">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Reply Rate</span>
              <MessageSquare className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {overview?.reply_rate_pct || 0}%
            </div>
            <p className="text-[11px] text-muted-foreground">
              {overview?.total_replied.toLocaleString() || 0} replies received
            </p>
          </Card>

          <Card className="p-4 space-y-2 border-border/80">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Bounce Rate</span>
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
              {overview?.bounce_rate_pct || 0}%
            </div>
            <p className="text-[11px] text-muted-foreground">
              {overview?.total_bounced.toLocaleString() || 0} undeliverable
            </p>
          </Card>
        </div>
      )}

      {/* Funnel & Conversion Rates */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7 p-5 space-y-5 border-border/80">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Outreach Funnel & Drop-off
              </h2>
              <p className="text-xs text-muted-foreground">
                Conversion percentages as leads advance through key stages.
              </p>
            </div>
            <Badge variant="outline" className="gap-1 text-xs">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <span>Full Pipeline</span>
            </Badge>
          </div>

          {pipelineLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-foreground">Contacted → Opened</span>
                  <span className="text-amber-600 dark:text-amber-400">
                    {pipeline?.conversions.contacted_to_opened_pct || 0}%
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(pipeline?.conversions.contacted_to_opened_pct || 0, 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-foreground">Opened → Replied</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {pipeline?.conversions.opened_to_replied_pct || 0}%
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(pipeline?.conversions.opened_to_replied_pct || 0, 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-foreground">Replied → Interested</span>
                  <span className="text-primary">
                    {pipeline?.conversions.replied_to_interested_pct || 0}%
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(pipeline?.conversions.replied_to_interested_pct || 0, 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-foreground">Interested → Meeting Booked</span>
                  <span className="text-purple-600 dark:text-purple-400">
                    {pipeline?.conversions.interested_to_meeting_pct || 0}%
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(pipeline?.conversions.interested_to_meeting_pct || 0, 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-foreground">Meeting Booked → Converted</span>
                  <span className="text-teal-600 dark:text-teal-400">
                    {pipeline?.conversions.meeting_to_converted_pct || 0}%
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(pipeline?.conversions.meeting_to_converted_pct || 0, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* 14-Day Timeline Trend */}
        <Card className="lg:col-span-5 p-5 space-y-4 border-border/80">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Activity (Last 14 Days)
            </h2>
            <p className="text-xs text-muted-foreground">
              Daily volume of sent emails and recorded opens.
            </p>
          </div>

          {timelineLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : !timeline || timeline.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-muted-foreground">
              No sending activity in the last 14 days
            </div>
          ) : (
            <ActivityChart timeline={timeline} />
          )}
        </Card>
      </div>

      {/* Top Performing Campaigns Leaderboard */}
      <Card className="p-5 space-y-4 border-border/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Top Performing Campaigns
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">Ranked by engagement</span>
        </div>

        {topLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : !topCampaigns || topCampaigns.length === 0 ? (
          <EmptyState
            icon={<BarChart2 className="h-8 w-8 text-muted-foreground" />}
            title="No campaigns launched yet"
            description="Create and start a campaign to see conversion rankings here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-medium">
                  <th className="text-left py-2.5 px-3">Campaign Name</th>
                  <th className="text-center py-2.5 px-3">Status</th>
                  <th className="text-right py-2.5 px-3">Sent</th>
                  <th className="text-right py-2.5 px-3">Delivered</th>
                  <th className="text-right py-2.5 px-3">Open Rate</th>
                  <th className="text-right py-2.5 px-3">Reply Rate</th>
                  <th className="text-right py-2.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {topCampaigns.map((camp: any) => (
                  <tr key={camp.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-3 font-medium text-foreground">
                      {camp.name}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Badge
                        variant="secondary"
                        className="text-[10px] uppercase font-mono py-0.5"
                      >
                        {camp.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right text-muted-foreground">
                      {camp.sent_count?.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-muted-foreground">
                      {camp.delivered_count?.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-amber-600 dark:text-amber-400">
                      {camp.open_rate_pct}%
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {camp.reply_rate_pct}%
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link href={`/tools/email/campaigns/${camp.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                          <span>View</span>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

interface ActivityDay {
  date: string;
  sent: number;
  opened: number;
}

function formatDay(isoDate: string): string {
  // "2026-11-17" as a local calendar date (no timezone shift).
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function dayDetail(day: ActivityDay): string {
  const rate = day.sent > 0 ? ` (${Math.round((day.opened / day.sent) * 100)}%)` : "";
  return `${day.sent} sent · ${day.opened} opened${rate}`;
}

/**
 * Daily sent/opened bars. Hover or focus a day for its numbers; click pins it
 * so the numbers stay in the legend row (click again to unpin).
 */
function ActivityChart({ timeline }: { timeline: ActivityDay[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const maxSent = Math.max(...timeline.map((t) => t.sent), 1);
  const focus = timeline.find((t) => t.date === (hovered ?? pinned)) ?? null;

  return (
    <div className="space-y-2 h-56 flex flex-col justify-end">
      <div className="flex items-end gap-1.5 h-44 w-full pt-4" onMouseLeave={() => setHovered(null)}>
        {timeline.map((item) => {
          const heightPct = Math.max((item.sent / maxSent) * 100, 4);
          const openedPct = Math.min((item.opened / Math.max(item.sent, 1)) * 100, 100);
          const active = focus?.date === item.date;
          return (
            <button
              type="button"
              key={item.date}
              aria-label={`${formatDay(item.date)}: ${dayDetail(item)}`}
              aria-pressed={pinned === item.date}
              onMouseEnter={() => setHovered(item.date)}
              onFocus={() => setHovered(item.date)}
              onBlur={() => setHovered(null)}
              onClick={() => setPinned((current) => (current === item.date ? null : item.date))}
              className="flex-1 min-w-0 flex flex-col items-center gap-1 relative h-full justify-end rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {hovered === item.date && (
                <span
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full mb-1 z-10 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11px] text-popover-foreground shadow-md"
                >
                  <span className="block font-medium">{formatDay(item.date)}</span>
                  <span className="block text-muted-foreground">{dayDetail(item)}</span>
                </span>
              )}
              <span
                className={`w-full rounded-t flex flex-col justify-end overflow-hidden transition-colors ${
                  active ? "bg-primary/50" : "bg-primary/20"
                }`}
                style={{ height: `${heightPct}%` }}
              >
                {/* Opens are part of what was sent: fill from the bottom. */}
                {item.opened > 0 && (
                  <span className="block w-full bg-amber-500" style={{ height: `${openedPct}%` }} />
                )}
              </span>
              <span
                className={`text-[9px] font-mono truncate w-full text-center ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {item.date.slice(5)}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs pt-2 border-t border-border/60">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded bg-primary/30" /> Sent
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded bg-amber-500" /> Opened
        </span>
        {focus ? (
          <span className="text-foreground" aria-live="polite">
            {formatDay(focus.date)}: {dayDetail(focus)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
