"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Send, Reply, ExternalLink, ChevronDown, ChevronUp, Sparkles, Paperclip, X, Download } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Textarea } from "@/shared/ui/Textarea";

import type { EmailInboxMessageOut, EmailThreadItem } from "../schemas";
import { useDraftInboxReply, useInboxThread, useSendInboxReply, useUpdateInboxMessage } from "../hooks";
import { REPLY_ATTACHMENT_MAX_BYTES, REPLY_ATTACHMENT_MAX_FILES } from "../api";

// Mirrors the backend's blocked list (email providers reject these).
const BLOCKED_EXTENSIONS = /\.(exe|bat|cmd|com|scr|pif|msi|js|jse|vbs|vbe|ps1|jar|hta|cpl|reg|lnk|wsf|apk)$/i;

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

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
      files: files.length > 0 ? files : undefined,
    });
    setReplyText("");
    setCc("");
    setFiles([]);
    setShowReplyForm(false);
    onReplySuccess?.();
  };

  // Reply attachments (sent with the email; names/sizes are kept in the thread).
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  const addFiles = (picked: File[]) => {
    const next = [...files];
    for (const file of picked) {
      if (BLOCKED_EXTENSIONS.test(file.name)) {
        toast.error(`${file.name}: this file type is blocked by email providers`);
        continue;
      }
      if (next.some((f) => f.name === file.name && f.size === file.size)) continue;
      next.push(file);
    }
    if (next.length > REPLY_ATTACHMENT_MAX_FILES) {
      toast.error(`Attach at most ${REPLY_ATTACHMENT_MAX_FILES} files`);
      return;
    }
    if (next.reduce((sum, f) => sum + f.size, 0) > REPLY_ATTACHMENT_MAX_BYTES) {
      toast.error(`Attachments can total at most ${REPLY_ATTACHMENT_MAX_BYTES / 1024 / 1024} MB`);
      return;
    }
    setFiles(next);
  };

  // AI draft from the whole thread; anything already typed is sent as notes and replaced by the draft.
  const draftMutation = useDraftInboxReply(message.id);
  const handleGenerateReply = async () => {
    try {
      const { body_text } = await draftMutation.mutateAsync(replyText.trim() || undefined);
      setReplyText(body_text);
    } catch {
      // toasted by the hook
    }
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
              placeholder="Type your reply, or a few notes and press Generate reply…"
              rows={draftMutation.isPending ? 4 : Math.min(12, Math.max(4, replyText.split("\n").length + 1))}
              className="text-xs"
              disabled={draftMutation.isPending}
            />

            {files.length > 0 && (
              <div className="flex flex-wrap gap-1.5" aria-label="Attachments">
                {files.map((file, i) => (
                  <span
                    key={`${file.name}-${file.size}-${i}`}
                    className="inline-flex max-w-[16rem] items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-[11px] text-foreground"
                  >
                    <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="truncate" title={file.name}>{file.name}</span>
                    <span className="shrink-0 text-muted-foreground">{formatBytes(file.size)}</span>
                    <button
                      type="button"
                      onClick={() => setFiles(files.filter((_, j) => j !== i))}
                      disabled={replyMutation.isPending}
                      className="shrink-0 rounded text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <span className="self-center text-[10px] text-muted-foreground">
                  {formatBytes(totalBytes)} of {REPLY_ATTACHMENT_MAX_BYTES / 1024 / 1024} MB
                </span>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  addFiles(Array.from(e.target.files ?? []));
                  e.target.value = ""; // allow picking the same file again after removing it
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={replyMutation.isPending}
                onClick={() => fileInputRef.current?.click()}
                className="gap-1.5 text-muted-foreground"
                title={`Attach files (up to ${REPLY_ATTACHMENT_MAX_FILES}, ${REPLY_ATTACHMENT_MAX_BYTES / 1024 / 1024} MB in total)`}
              >
                <Paperclip className="h-3.5 w-3.5" />
                <span>Attach</span>
              </Button>
              {message.campaign_id ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={draftMutation.isPending || replyMutation.isPending}
                  onClick={handleGenerateReply}
                  className="gap-1.5 text-primary"
                  title="Write a reply with the campaign's AI model from this whole conversation. What you typed is used as notes. Nothing is sent."
                >
                  <Sparkles className={`h-3.5 w-3.5 ${draftMutation.isPending ? "animate-pulse" : ""}`} />
                  <span>
                    {draftMutation.isPending
                      ? "Writing…"
                      : replyText.trim()
                        ? "Generate reply from my notes"
                        : "Generate reply"}
                  </span>
                </Button>
              ) : null}
              </div>
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
            attachments: [],
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
          // Sent HTML carries its own inline colours (dark text for white email
          // backgrounds), so show it on white paper like an email client does;
          // inverting it for dark mode made styled emails unreadable.
          <div
            className="prose prose-sm max-w-none rounded-md bg-white p-3 text-[#1f2937] [&_a]:text-[#2563eb]"
            dangerouslySetInnerHTML={{ __html: item.body_html }}
          />
        ) : (
          <p className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
            {item.body_text?.trim() || (
              <span className="text-muted-foreground italic">No text content</span>
            )}
          </p>
        )}
        {item.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Attachments sent">
            {item.attachments.map((file, i) => {
              const chip = (
                <>
                  {file.downloadable ? (
                    <Download className="h-3 w-3 shrink-0 text-primary" aria-hidden />
                  ) : (
                    <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <span className={`truncate ${file.downloadable ? "" : "text-muted-foreground"}`}>{file.filename}</span>
                  {file.size ? <span className="shrink-0 text-muted-foreground">{formatBytes(file.size)}</span> : null}
                </>
              );
              const base =
                "inline-flex max-w-[16rem] items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-[11px] text-foreground";
              return file.downloadable ? (
                <a
                  key={`${file.filename}-${i}`}
                  href={`/api/email/email-inbox/replies/${item.id}/attachments/${file.index ?? i}`}
                  download={file.filename}
                  className={`${base} hover:border-primary/50 hover:bg-primary/10`}
                  title={
                    file.expires_at
                      ? `Download · kept until ${new Date(file.expires_at).toLocaleDateString([], { dateStyle: "medium" })}`
                      : "Download"
                  }
                >
                  {chip}
                </a>
              ) : (
                <span
                  key={`${file.filename}-${i}`}
                  className={base}
                  title={
                    file.deleted_at
                      ? `Deleted from storage on ${new Date(file.deleted_at).toLocaleDateString([], { dateStyle: "medium" })} (files are kept for 30 days)`
                      : "Sent before attachments were stored, so it can't be downloaded"
                  }
                >
                  {chip}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
