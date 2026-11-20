"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Send, Reply, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Textarea } from "@/shared/ui/Textarea";

import type { EmailInboxMessageOut, EmailThreadItem } from "../schemas";
import { useInboxThread, useSendInboxReply, useUpdateInboxMessage } from "../hooks";

interface InboxMessageProps {
  message: EmailInboxMessageOut;
  onReplySuccess?: () => void;
}

export function InboxMessage({ message, onReplySuccess }: InboxMessageProps) {
  const [replyText, setReplyText] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(
    message.subject.toLowerCase().startsWith("re:")
      ? message.subject
      : `Re: ${message.subject}`
  );
  const [showReplyForm, setShowReplyForm] = useState(false);

  const replyMutation = useSendInboxReply(message.id);
  const updateMutation = useUpdateInboxMessage(message.id);

  const handleSendReply = async () => {
    if (!replyText.trim()) {
      toast.error("Reply text cannot be empty");
      return;
    }

    await replyMutation.mutateAsync({
      subject,
      body_text: replyText,
      cc: cc.trim() || undefined,
    });
    setReplyText("");
    setCc("");
    setShowReplyForm(false);
    onReplySuccess?.();
  };

  const handleClassificationChange = (newClass: string) => {
    updateMutation.mutate({ classification: newClass });
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-3 border-b border-border/40">
        <h2 className="text-base font-bold text-foreground">{message.subject}</h2>

        <div className="flex items-center gap-2 shrink-0">
          {message.campaign_id && (
            <Button asChild variant="outline" size="sm" className="gap-1 text-xs h-7">
              <Link href={`/tools/email/campaigns/${message.campaign_id}/inbox`}>
                <span>View Campaign</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </Button>
          )}

          <select
            value={message.classification || "other"}
            onChange={(e) => handleClassificationChange(e.target.value)}
            className="h-7 rounded border border-border bg-background px-2 text-xs text-foreground focus:outline-none"
          >
            <option value="interested">🟢 Interested</option>
            <option value="out_of_office">🟡 Out of Office</option>
            <option value="not_interested">🔴 Not Interested</option>
            <option value="unsubscribe">🟣 Unsubscribe</option>
            <option value="bounce">⚠️ Bounce</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Conversation: cold email → lead reply → your reply → … (oldest first) */}
      <ConversationThread messageId={message.id} fallback={message} />

      {/* Reply Action */}
      <div className="pt-2">
        {!showReplyForm ? (
          <Button size="sm" onClick={() => setShowReplyForm(true)} className="gap-1.5">
            <Reply className="h-4 w-4" />
            <span>Reply via Mailbox SMTP</span>
          </Button>
        ) : (
          <Card className="p-4 space-y-3 border-primary/40 bg-card shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Reply className="h-3.5 w-3.5 text-primary" /> Quick Reply
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground"
                onClick={() => setShowReplyForm(false)}
              >
                Close
              </Button>
            </div>

            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject..."
              className="text-xs h-8"
            />

            <Input
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="Cc (optional, comma separated)"
              className="text-xs h-8"
            />

            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply message..."
              rows={4}
              className="text-xs"
            />

            <div className="flex justify-end gap-2 pt-1">
              <Button
                size="sm"
                disabled={replyMutation.isPending || !replyText.trim()}
                onClick={handleSendReply}
                className="gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{replyMutation.isPending ? "Sending..." : "Send Reply"}</span>
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Thread view
// ---------------------------------------------------------------------------

const KIND_STYLE: Record<EmailThreadItem["kind"], { label: string; card: string; avatar: string }> = {
  cold: {
    label: "Cold email",
    card: "border-border/60 bg-card/60",
    avatar: "bg-muted text-muted-foreground",
  },
  followup: {
    label: "Follow-up",
    card: "border-border/60 bg-card/60",
    avatar: "bg-muted text-muted-foreground",
  },
  inbound: {
    label: "Lead",
    card: "border-emerald-500/30 bg-emerald-500/5",
    avatar: "bg-emerald-500/20 text-emerald-500",
  },
  outbound: {
    label: "You",
    card: "border-primary/40 bg-primary/5",
    avatar: "bg-primary/20 text-primary",
  },
};

/** "Name <a@b.com>" -> "Name"; bare address is returned as-is. */
function shortName(addr: string): string {
  const m = addr.match(/^\s*"?([^"<]+?)"?\s*<[^>]+>\s*$/);
  return m ? m[1] : addr;
}

function formatDate(value?: string | null): string {
  return value ? new Date(value).toLocaleString() : "";
}

function ConversationThread({
  messageId,
  fallback,
}: {
  messageId: string;
  fallback: EmailInboxMessageOut;
}) {
  const { data: thread, isLoading, isError } = useInboxThread(messageId);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Show the newest message when a thread opens or grows. Scroll only this
  // list: scrollIntoView would also scroll every ancestor, including the
  // inbox's overflow-hidden frame, pushing the search box out of view.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  }, [messageId, thread?.length]);

  if (isLoading) {
    return <div className="flex-1 p-4 text-xs text-muted-foreground">Loading conversation…</div>;
  }

  const items: EmailThreadItem[] =
    !isError && thread && thread.length > 0
      ? thread
      : [
          {
            id: fallback.id,
            kind: "inbound",
            from_name: fallback.from_name,
            from_email: fallback.from_email,
            to: fallback.to_email ? [fallback.to_email] : [],
            cc: fallback.cc ? [fallback.cc] : [],
            subject: fallback.subject,
            body_text: fallback.body_text,
            body_html: fallback.body_text ? null : fallback.body_html,
            date: fallback.received_at,
            classification: fallback.classification,
          },
        ];

  return (
    <div ref={scrollerRef} className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
      {items.map((item) => (
        <ThreadCard
          key={`${item.kind}-${item.id}`}
          item={item}
          highlighted={item.kind === "inbound" && item.id === messageId}
        />
      ))}
    </div>
  );
}

function ThreadCard({ item, highlighted }: { item: EmailThreadItem; highlighted: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const style = KIND_STYLE[item.kind];
  const name = item.from_name || item.from_email;
  const toSummary = item.to.map(shortName).join(", ");

  return (
    <div className={`rounded-xl border p-4 ${style.card} ${highlighted ? "ring-1 ring-primary/50" : ""}`}>
      {/* Sender line — compact, click to expand From/To/Cc */}
      <div className="flex items-start gap-3">
        <div
          className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${style.avatar}`}
        >
          {name.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-foreground truncate">{name}</span>
              <Badge className="text-[10px] px-1.5 py-0">
                {item.kind === "followup" && item.step_number
                  ? `Follow-up ${item.step_number - 1}`
                  : style.label}
              </Badge>
            </div>
            <span className="text-[11px] text-muted-foreground shrink-0">{formatDate(item.date)}</span>
          </div>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground max-w-full"
            aria-expanded={expanded}
          >
            <span className="truncate">
              to {toSummary || "—"}
              {item.cc.length > 0 && ` · cc ${item.cc.map(shortName).join(", ")}`}
            </span>
            {expanded ? (
              <ChevronUp className="h-3 w-3 shrink-0" />
            ) : (
              <ChevronDown className="h-3 w-3 shrink-0" />
            )}
          </button>

          {expanded && (
            <dl className="mt-2 grid grid-cols-[3.5rem_1fr] gap-x-2 gap-y-0.5 text-[11px] rounded-md bg-background/50 p-2">
              <dt className="text-muted-foreground">From</dt>
              <dd className="text-foreground break-all">
                {item.from_name ? `${item.from_name} <${item.from_email}>` : item.from_email}
              </dd>
              <dt className="text-muted-foreground">To</dt>
              <dd className="text-foreground break-all">{item.to.join(", ") || "—"}</dd>
              {item.cc.length > 0 && (
                <>
                  <dt className="text-muted-foreground">Cc</dt>
                  <dd className="text-foreground break-all">{item.cc.join(", ")}</dd>
                </>
              )}
              <dt className="text-muted-foreground">Date</dt>
              <dd className="text-foreground">{formatDate(item.date)}</dd>
              <dt className="text-muted-foreground">Subject</dt>
              <dd className="text-foreground">{item.subject}</dd>
            </dl>
          )}
        </div>
      </div>

      {/* Full message body — quoted history already stripped server-side */}
      <div className="mt-3 pl-11">
        {item.body_html ? (
          <div
            className="prose prose-sm max-w-none text-foreground dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: item.body_html }}
          />
        ) : (
          <p className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
            {item.body_text?.trim() || (
              <span className="text-muted-foreground italic">No text content</span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
