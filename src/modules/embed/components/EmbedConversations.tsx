"use client";

import { ArrowLeft, ChevronLeft, ChevronRight, MessagesSquare } from "lucide-react";
import * as React from "react";

import { Markdown } from "@/modules/chat/components/Markdown";
import { cn } from "@/shared/lib/cn";
import { Badge, Button, EmptyState, ErrorNotice, RelativeTime, SkeletonText } from "@/shared/ui";

import { EMBED_CONVERSATIONS_PAGE_SIZE } from "../api";
import { useEmbedConversations, useEmbedTranscript } from "../hooks";
import type { EmbedTranscriptMessage } from "../schemas";

const DONE_STATUSES = new Set(["completed", "complete", "success", "succeeded", "done"]);

function MessageBubble({ message }: { message: EmbedTranscriptMessage }) {
  const isUser = message.role === "user";
  const content = message.content?.trim() ?? "";
  const showStatus = message.status && !DONE_STATUSES.has(message.status.toLowerCase());

  return (
    <li className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium">{isUser ? "Visitor" : "Assistant"}</span>
        <RelativeTime dateTime={message.created_at} />
        {showStatus ? <Badge variant="warning">{message.status}</Badge> : null}
      </div>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm",
          isUser ? "bg-primary text-primary-foreground" : "border border-border bg-card",
        )}
      >
        {!content ? (
          <span className="italic opacity-70">No content</span>
        ) : isUser ? (
          <p className="whitespace-pre-wrap break-words">{content}</p>
        ) : (
          <Markdown content={content} />
        )}
      </div>
    </li>
  );
}

export function EmbedTranscriptView({
  widgetId,
  sessionId,
  onBack,
}: {
  widgetId: string;
  sessionId: string;
  onBack: () => void;
}) {
  const transcript = useEmbedTranscript(widgetId, sessionId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft aria-hidden />
          All conversations
        </Button>
        <Badge variant="neutral">Read-only</Badge>
      </div>

      {transcript.isPending ? (
        <SkeletonText lines={4} />
      ) : transcript.error ? (
        <ErrorNotice error={transcript.error} onRetry={() => void transcript.refetch()} />
      ) : transcript.data.messages.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="No messages"
          description="The visitor opened the widget but did not send anything."
        />
      ) : (
        <ol className="space-y-4" aria-label="Transcript">
          {transcript.data.messages.map((message, index) => (
            <MessageBubble key={`${message.created_at}-${index}`} message={message} />
          ))}
        </ol>
      )}
    </div>
  );
}

export function EmbedConversations({ widgetId }: { widgetId: string }) {
  const [offset, setOffset] = React.useState(0);
  const [openSession, setOpenSession] = React.useState<string | null>(null);
  const conversations = useEmbedConversations(widgetId, offset);

  if (openSession) {
    return (
      <EmbedTranscriptView
        widgetId={widgetId}
        sessionId={openSession}
        onBack={() => setOpenSession(null)}
      />
    );
  }

  if (conversations.isPending) return <SkeletonText lines={4} />;
  if (conversations.error) {
    return <ErrorNotice error={conversations.error} onRetry={() => void conversations.refetch()} />;
  }

  const rows = conversations.data;
  const hasMore = rows.length >= EMBED_CONVERSATIONS_PAGE_SIZE;

  if (rows.length === 0 && offset === 0) {
    return (
      <EmptyState
        icon={MessagesSquare}
        title="No conversations yet"
        description="Once visitors chat with the widget on your website, their conversations show up here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No more conversations.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {rows.map((row) => (
            <li key={row.session_id}>
              <button
                type="button"
                onClick={() => setOpenSession(row.session_id)}
                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  {row.first_message?.trim() || (
                    <span className="italic text-muted-foreground">No message</span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    {row.message_count} {row.message_count === 1 ? "message" : "messages"}
                  </span>
                  <RelativeTime dateTime={row.updated_at} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {offset > 0 || hasMore ? (
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={offset === 0 || conversations.isFetching}
            onClick={() => setOffset((o) => Math.max(0, o - EMBED_CONVERSATIONS_PAGE_SIZE))}
          >
            <ChevronLeft aria-hidden />
            Newer
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasMore || conversations.isFetching}
            onClick={() => setOffset((o) => o + EMBED_CONVERSATIONS_PAGE_SIZE)}
          >
            Older
            <ChevronRight aria-hidden />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
