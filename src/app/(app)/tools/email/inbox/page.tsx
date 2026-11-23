"use client";

import { useState } from "react";
import { Inbox, CheckCheck, RefreshCw, Filter, Search, ChevronDown } from "lucide-react";

import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Skeleton } from "@/shared/ui/Skeleton";
import { EmptyState } from "@/shared/ui/EmptyState";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/DropdownMenu";

import {
  useEmailCampaigns,
  useInboxMessages,
  useMarkAllInboxRead,
  usePollInboxNow,
} from "@/modules/email/hooks";
import { InboxList } from "@/modules/email/components/InboxList";
import { InboxMessage } from "@/modules/email/components/InboxMessage";
import type { EmailInboxMessageOut } from "@/modules/email/schemas";

export default function UnifiedInboxPage() {
  const [selectedMessage, setSelectedMessage] = useState<EmailInboxMessageOut | null>(null);
  const [classificationFilter, setClassificationFilter] = useState("all");
  const [search, setSearch] = useState("");
  // Empty = all campaigns.
  const [campaignIds, setCampaignIds] = useState<string[]>([]);
  const { data: campaigns } = useEmailCampaigns();
  const campaignList: { id: string; name: string }[] = campaigns ?? [];

  const updateCampaigns = (ids: string[]) => {
    setCampaignIds(ids);
    setSelectedMessage(null);
  };
  const pickedNames = campaignList.filter((c) => campaignIds.includes(c.id)).map((c) => c.name);
  const campaignLabel =
    pickedNames.length === 0
      ? "All campaigns"
      : pickedNames.length === 1
        ? pickedNames[0]
        : `${pickedNames.length} campaigns`;

  const { data: messages, isLoading, refetch } = useInboxMessages({
    classification: classificationFilter !== "all" ? classificationFilter : undefined,
    search: search || undefined,
    campaign_ids: campaignIds.length > 0 ? campaignIds : undefined,
  });

  const markAllReadMutation = useMarkAllInboxRead();
  const pollMutation = usePollInboxNow();

  const activeMessage =
    selectedMessage || (messages && messages.length > 0 ? messages[0] : null);

  return (
    <div className="flex-1 space-y-4 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Unified Inbox
          </h1>
          <p className="text-sm text-muted-foreground">
            Aggregated responses from all configured mailboxes with automated reply classification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pollMutation.isPending}
            onClick={() => pollMutation.mutate()}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${pollMutation.isPending ? "animate-spin" : ""}`} />
            <span>Poll Inboxes</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={markAllReadMutation.isPending}
            onClick={() => markAllReadMutation.mutate()}
            className="gap-1.5"
          >
            <CheckCheck className="h-4 w-4" />
            <span>Mark All Read</span>
          </Button>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex w-full flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search replies by sender, subject..."
              className="pl-9 h-9 text-xs"
            />
          </div>
          {/* Replies linked to any picked campaign; none picked = every mailbox reply. */}
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Filter by campaign"
              className="flex h-9 w-64 shrink-0 items-center justify-between gap-2 rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <span className="truncate" title={campaignLabel}>
                {campaignLabel}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="max-h-80 w-[var(--radix-dropdown-menu-trigger-width)] min-w-64 overflow-y-auto"
            >
              <DropdownMenuCheckboxItem
                checked={campaignIds.length === 0}
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={() => updateCampaigns([])}
                className="text-xs"
              >
                All campaigns
              </DropdownMenuCheckboxItem>
              {campaignList.length > 0 && <DropdownMenuSeparator />}
              {campaignList.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.id}
                  checked={campaignIds.includes(c.id)}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={() =>
                    updateCampaigns(
                      campaignIds.includes(c.id)
                        ? campaignIds.filter((id) => id !== c.id)
                        : [...campaignIds, c.id],
                    )
                  }
                  className="text-xs"
                  title={c.name}
                >
                  <span className="truncate">{c.name}</span>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={classificationFilter}
            onChange={(e) => setClassificationFilter(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Classifications</option>
            <option value="interested">🟢 Interested</option>
            <option value="out_of_office">🟡 Out of Office</option>
            <option value="not_interested">🔴 Not Interested</option>
            <option value="unsubscribe">🟣 Unsubscribe</option>
            <option value="bounce">⚠️ Bounced</option>
          </select>
        </div>
      </div>

      {/* 2-Panel Inbox Layout */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[600px] rounded-xl" />
          <Skeleton className="col-span-2 h-[600px] rounded-xl" />
        </div>
      ) : !messages || messages.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-10 w-10 text-muted-foreground" />}
          title="Inbox is empty"
          description="When recipients reply to your outreach emails, responses will appear here categorized as Interested, OOO, or Unsubscribe."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[720px]">
          {/* Left: Message list */}
          <Card className="overflow-hidden border border-border flex flex-col h-full bg-card">
            <div className="p-3 bg-muted/30 border-b border-border/40 text-xs font-semibold text-muted-foreground">
              Messages ({messages.length})
            </div>
            <InboxList
              messages={messages}
              selectedId={activeMessage?.id || null}
              onSelect={(msg) => setSelectedMessage(msg)}
            />
          </Card>

          {/* Right: Detail & reply */}
          <Card className="col-span-2 p-6 border border-border flex flex-col h-full bg-card">
            {activeMessage ? (
              <InboxMessage message={activeMessage} />
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                Select a message to view content and reply
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
