"use client";

import { use, useState } from "react";
import { Inbox, RefreshCw, CheckCheck, Search } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Skeleton } from "@/shared/ui/Skeleton";
import { EmptyState } from "@/shared/ui/EmptyState";
import { useInboxMessages, useMarkAllInboxRead, usePollInboxNow } from "@/modules/email/hooks";
import { InboxList } from "@/modules/email/components/InboxList";
import { InboxMessage } from "@/modules/email/components/InboxMessage";
import type { EmailInboxMessageOut } from "@/modules/email/schemas";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lead?: string | string[] }>;
}

export default function CampaignInboxSubTabPage({ params, searchParams }: PageProps) {
  const { id } = use(params);
  const { lead } = use(searchParams);
  // Set when arriving from a Kanban card: open that lead's conversation
  const leadId = Array.isArray(lead) ? lead[0] : lead;
  const [selectedMessage, setSelectedMessage] = useState<EmailInboxMessageOut | null>(null);
  const [search, setSearch] = useState("");

  // One row per lead: the conversation's last message, theirs or ours.
  const { data: messages, isLoading, refetch } = useInboxMessages({
    campaign_id: id,
    search: search || undefined,
    group: "conversation",
  });

  const markAllReadMutation = useMarkAllInboxRead();
  const pollMutation = usePollInboxNow();

  // Messages are newest-first, so find() gives the lead's latest reply
  const leadMessage = leadId ? messages?.find((m) => m.lead_id === leadId) ?? null : null;
  const leadHasNoReplies = Boolean(leadId && messages && !leadMessage);

  const activeMessage =
    selectedMessage || leadMessage || (messages && messages.length > 0 ? messages[0] : null);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Campaign Inbox
          </h2>
          <p className="text-sm text-muted-foreground">
            Replies received specifically for this campaign, linked by Message-ID and sender.
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
            <span>Poll Replies</span>
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

      {leadHasNoReplies && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
          This lead hasn&apos;t replied yet, so there&apos;s no conversation to continue. Showing the latest campaign replies instead.
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[650px]">
          <div className="lg:col-span-5 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div className="lg:col-span-7">
            <Skeleton className="h-full w-full" />
          </div>
        </div>
      ) : !messages || messages.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-10 w-10 text-muted-foreground" />}
          title="No replies for this campaign"
          description="Responses from leads in this campaign will automatically show up here."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[650px] border border-border rounded-xl overflow-hidden bg-card">
          {/* Left panel: Message List */}
          <div className="lg:col-span-5 border-r border-border flex flex-col h-full">
            <div className="p-3 border-b border-border bg-muted/20">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter by sender or subject..."
                  className="pl-8 h-9 text-xs"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <InboxList
                messages={messages}
                selectedId={activeMessage?.id ?? null}
                onSelect={(msg) => setSelectedMessage(msg)}
              />
            </div>
          </div>

          {/* Right panel: Message Detail View + Quick Reply */}
          <div className="lg:col-span-7 flex flex-col h-full overflow-hidden bg-background">
            {activeMessage ? (
              <InboxMessage
                key={activeMessage.id}
                message={activeMessage}
                onReplySuccess={() => refetch()}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Select a message to view the thread and send a reply
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
