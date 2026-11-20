"use client";

import { CheckCircle2, Clock, XCircle, AlertCircle, Eye, MousePointerClick } from "lucide-react";
import { Badge } from "@/shared/ui/Badge";
import { Card } from "@/shared/ui/Card";
import { EmptyState } from "@/shared/ui/EmptyState";
import type { EmailSendOut } from "../schemas";

interface SendLogTableProps {
  sends: EmailSendOut[];
}

export function SendLogTable({ sends }: SendLogTableProps) {
  if (!sends || sends.length === 0) {
    return (
      <EmptyState
        icon={<Clock className="h-10 w-10 text-muted-foreground" />}
        title="No emails dispatched yet"
        description="Individual send audit events will stream here once the background worker starts executing the campaign."
      />
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "bounced":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-rose-500" />;
      default:
        return <Clock className="h-4 w-4 text-amber-500 animate-pulse" />;
    }
  };

  return (
    <Card className="overflow-hidden border border-border">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 text-muted-foreground border-b border-border font-medium">
            <tr>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Recipient</th>
              <th className="px-4 py-3">Rendered Subject</th>
              <th className="px-4 py-3">Dispatched At</th>
              <th className="px-4 py-3 text-center">Engagement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {sends.map((send) => (
              <tr key={send.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 font-medium capitalize">
                    {getStatusIcon(send.status)}
                    <span
                      className={
                        send.status === "delivered"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : send.status === "bounced"
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }
                    >
                      {send.status}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 font-semibold text-foreground">
                  {send.lead_email || "Lead"}
                </td>
                <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                  {send.rendered_subject || "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-[11px]">
                  {send.sent_at ? new Date(send.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "Queued"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-3 text-muted-foreground text-[11px]">
                    <span className="flex items-center gap-1" title="Opens">
                      <Eye className={`h-3 w-3 ${send.open_count > 0 ? "text-amber-500 font-bold" : ""}`} />
                      <span>{send.open_count}</span>
                    </span>
                    <span className="flex items-center gap-1" title="Clicks">
                      <MousePointerClick className={`h-3 w-3 ${send.click_count > 0 ? "text-blue-500 font-bold" : ""}`} />
                      <span>{send.click_count}</span>
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
