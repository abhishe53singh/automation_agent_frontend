"use client";

import { MessageSquare, Mail, Sparkles, Building } from "lucide-react";
import { Badge } from "@/shared/ui/Badge";
import { Card } from "@/shared/ui/Card";
import type { EmailInboxMessageOut } from "../schemas";

interface InboxListProps {
  messages: EmailInboxMessageOut[];
  selectedId: string | null;
  onSelect: (msg: EmailInboxMessageOut) => void;
}

export function InboxList({ messages, selectedId, onSelect }: InboxListProps) {
  const getClassificationBadge = (classification: string | null) => {
    switch (classification) {
      case "interested":
        return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px] py-0">🟢 Interested</Badge>;
      case "out_of_office":
        return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px] py-0">🟡 Out of Office</Badge>;
      case "not_interested":
        return <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30 text-[10px] py-0">🔴 Not Interested</Badge>;
      case "unsubscribe":
        return <Badge className="bg-purple-500/15 text-purple-600 border-purple-500/30 text-[10px] py-0">🟣 Unsubscribe</Badge>;
      case "bounce":
        return <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px] py-0">⚠️ Bounced</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] py-0">Reply</Badge>;
    }
  };

  return (
    <div className="divide-y divide-border/60 overflow-y-auto max-h-[680px] scrollbar-thin">
      {messages.map((msg) => {
        const isSelected = selectedId === msg.id;

        return (
          <div
            key={msg.id}
            onClick={() => onSelect(msg)}
            className={`p-3.5 cursor-pointer transition-colors flex flex-col gap-1.5 ${
              isSelected
                ? "bg-primary/5 border-l-2 border-l-primary"
                : "hover:bg-muted/30"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 truncate">
                {!msg.is_read && (
                  <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                )}
                <span
                  className={`text-xs truncate ${
                    !msg.is_read ? "font-bold text-foreground" : "font-medium text-foreground"
                  }`}
                >
                  {msg.from_name || msg.from_email}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {new Date(msg.last_activity_at ?? msg.received_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            <p className="text-xs text-foreground font-medium truncate">
              {msg.subject}
            </p>

            {/* Conversation rows preview the thread's LAST message, ours included. */}
            <p className="text-[11px] text-muted-foreground line-clamp-1">
              {msg.last_from_me ? <span className="font-medium text-foreground">You: </span> : null}
              {(msg.last_preview ?? msg.body_text) || "No text preview"}
            </p>

            <div className="flex items-center justify-between pt-1">
              {getClassificationBadge(msg.classification)}
              {msg.reply_count && msg.reply_count > 1 ? (
                <span className="text-[10px] text-muted-foreground">
                  {msg.reply_count} replies
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
